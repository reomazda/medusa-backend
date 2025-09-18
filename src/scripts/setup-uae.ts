import { ExecArgs, CreateInventoryLevelInput } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function setupUae({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const storeModuleService = container.resolve(Modules.STORE)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  // Ensure default location exists
  const [store] = await storeModuleService.listStores()
  let defaultLocationId = store?.default_location_id
  if (!defaultLocationId) {
    const { result: locRes } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "UAE Warehouse",
            address: { country_code: "AE", city: "Dubai", address_1: "" },
          },
        ],
      },
    })
    defaultLocationId = locRes[0].id
    await updateStoresWorkflow(container).run({
      input: { selector: { id: store.id }, update: { default_location_id: defaultLocationId } },
    })
  }

  // Ensure AED is supported by Store
  const supported = new Set((store.supported_currencies || []).map((c: any) => c.currency_code))
  if (!supported.has("aed")) {
    const updated = Array.from(supported)
      .concat(["aed"]) // keep existing + add AED
      .map((code, idx) => ({ currency_code: code as string, is_default: idx === 0 }))
    await updateStoresWorkflow(container).run({
      input: { selector: { id: store.id }, update: { supported_currencies: updated } },
    })
    logger.info("Enabled AED in store supported_currencies")
  }

  // Create UAE region (AED)
  const { result: regionRes } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United Arab Emirates",
          currency_code: "aed",
          countries: ["ae"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })
  const uaeRegion = regionRes[0]
  logger.info(`Ensured region ${uaeRegion.name}`)

  // Ensure default shipping profile
  const profiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  let shippingProfile = profiles[0]
  if (!shippingProfile) {
    const { result: profRes } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    shippingProfile = profRes[0]
  }

  // Create shipping options for UAE region
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Delivery (UAE)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: null as unknown as string, // not required by core-flows when using region price
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "1-2 days (UAE)", code: "standard_uae" },
        prices: [
          { currency_code: "aed", amount: 30 },
          { region_id: uaeRegion.id, amount: 30 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Express Delivery (Dubai)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: null as unknown as string,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Express", description: "1-2 hours (Dubai)", code: "express_dubai" },
        prices: [
          { currency_code: "aed", amount: 40 },
          { region_id: uaeRegion.id, amount: 40 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  logger.info("Created UAE shipping options: Standard/Express")
}

