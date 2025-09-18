// import { loadEnv, defineConfig } from '@medusajs/framework/utils'

// loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// module.exports = defineConfig({
//   projectConfig: {
//     databaseUrl: process.env.DATABASE_URL,
//     http: {
//       storeCors: process.env.STORE_CORS!,
//       adminCors: process.env.ADMIN_CORS!,
//       authCors: process.env.AUTH_CORS!,
//       jwtSecret: process.env.JWT_SECRET || "supersecret",
//       cookieSecret: process.env.COOKIE_SECRET || "supersecret",
//     }
//   }
// })

import { loadEnv, defineConfig } from '@medusajs/framework/utils'
loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const parseCors = (v?: string) =>
  (v || '').split(',').map(s => s.trim()).filter(Boolean)

export default defineConfig({
  admin: {
    // AdminはVercelに分離するので無効化
    disable: process.env.ADMIN_DISABLED === 'true' || true,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      adminCors: parseCors(process.env.ADMIN_CORS), // 例: https://your-admin.vercel.app
      storeCors: parseCors(process.env.STORE_CORS),
      authCors:  parseCors(process.env.AUTH_CORS),
      jwtSecret:    process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
      host: process.env.HOST || '0.0.0.0',
      port: Number(process.env.PORT || 9000),
    },
  },
})
