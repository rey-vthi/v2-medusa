import {MedusaService} from "@medusajs/utils";
import RedisEventBusService from "@medusajs/event-bus-redis/dist/services/event-bus-redis";
import {Logger} from "@medusajs/medusa";
import logger from "@medusajs/medusa-cli/dist/reporter";

type InjectedDependencies = {
    logger: Logger
    eventBusModuleService: RedisEventBusService
}

export default class HelloModuleService extends MedusaService({}){
    protected eventBusModuleService_: RedisEventBusService;

    constructor({eventBusModuleService}) {
        super(...arguments);
        console.log("0"+Object.keys(arguments[0]));
        this.eventBusModuleService_ = eventBusModuleService;
        // logger.debug("HelloModuleService initialized");
    }

    getMessage() {
        logger.info("HelloModuleService initialized");
        this.eventBusModuleService_.emit({eventName: "offer-created", data: "HI"}).then(r => logger.info("Successfully emitted"));
        return "Hello, world! from method"
    }
}
