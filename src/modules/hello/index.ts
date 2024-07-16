import HelloModuleService from "./service"
import { Module } from "@medusajs/utils"

export default Module("hello", {
    service: HelloModuleService,
})