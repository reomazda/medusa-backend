import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import {
  createProductsWorkflow,
  createProductCategoriesWorkflow,
  createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function addUaeCrownbar({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const storeModuleService = container.resolve(Modules.STORE)

  // Ensure Default Sales Channel exists
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({ name: "Default Sales Channel" })
  if (!defaultSalesChannel.length) {
    defaultSalesChannel = await salesChannelModuleService.createSalesChannels([{ name: "Default Sales Channel" }])
  }

  // Ensure categories
  const categoryNames = [
    "DISPOSABLE",
    "STARTER KIT",
    "E-LIQUID",
    "POD SYSTEM KITS",
    "NEW ARRIVAL",
  ]
  await createProductCategoriesWorkflow(container).run({
    input: { product_categories: categoryNames.map((name) => ({ name, is_active: true })) },
  })

  // UAE common metadata
  const uaeMeta = {
    shipping_fast_uae: true,
    delivery_standard_fee_aed: 30,
    delivery_express_fee_aed: 40,
    free_delivery_threshold_aed: 300,
    warranty_years: 1,
    return_days: 30,
    store_brand: "VAPORKING",
    contact_phone: "+971 55 208 4910",
  }

  // Product template: Crown Bar 8000 Pro DTL
  const flavors = [
    "Berry Ice",
    "Blueberry Gum",
    "Cherry Fiesta",
    "Blue Razz Lemonade",
    "Gum Mint",
    "Lush Ice",
    "Hubba",
    "Peach Ice",
    "Two Apple",
    "Grape Mint",
  ]

  const variants = flavors.map((flavor) => ({
    title: flavor,
    sku: `AFCB-8000PRO-DTL-${flavor.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`.slice(0, 48),
    manage_inventory: true,
    prices: [{ currency_code: "aed", amount: 40 }],
    options: { Flavor: flavor },
  }))

  const { result: created } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Crown Bar Al Fakher 8000 Pro DTL 8000Puffs Dual Mode Disposable Vape In UAE",
          handle: "crown-bar-al-fakher-8000-pro-dtl-uae",
          status: ProductStatus.PUBLISHED,
          description:
            "DTL/MLT両対応。800mAhバッテリー搭載、最大8000パフ。20+フレーバーから選択可能。UAE国内迅速配送。",
          options: [{ title: "Flavor", values: flavors }],
          //tags: ["disposable", "al-fakher", "crown-bar", "8000", "dtl"],
          variants,
          metadata: {
            brand: "Al Fakher",
            model: "Crown Bar 8000Pro Dual Mode",
            puffs: 8000,
            battery_mAh: 800,
            nicotine_note: "DTL 0.5mg 表記。地域規制に応じて変更可。",
            dual_mode: true,
            ...uaeMeta,
          },
        },
      ],
    },
  })

  const product = created[0]
  logger.info(`Created UAE product: ${product.title} with ${product.variants.length} variants`)
}

