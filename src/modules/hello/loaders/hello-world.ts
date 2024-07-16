import {
    LoaderOptions,
} from "@medusajs/modules-sdk"
import { Logger } from "@medusajs/medusa"

export default function helloWorldLoader({
                                             container,
                                         }: LoaderOptions) {
    const logger: Logger = container.resolve("logger")

    logger.info("[helloWorldLoader]: Hello, World!")
}

