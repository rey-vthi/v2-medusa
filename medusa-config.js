import {loadEnv, defineConfig, Modules, ModuleRegistrationName} from '@medusajs/utils'

loadEnv(process.env.NODE_ENV, process.cwd())

const modules = {
  [Modules.EVENT_BUS]: {
    resolve: '@medusajs/event-bus-redis',
    options: {
      redisUrl: process.env.REDIS_URL,
    },
  },
  helloModuleService: {
    resolve: "./modules/hello",
    dependencies: [ModuleRegistrationName.EVENT_BUS, "logger"],
  },
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS,
      adminCors: process.env.ADMIN_CORS,
      authCors: process.env.AUTH_CORS,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  }, modules,
})
