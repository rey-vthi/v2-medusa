"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return seedDemoData;
    }
});
const _coreflows = require("@medusajs/core-flows");
const _utils = require("@medusajs/utils");
async function seedDemoData({ container }) {
    const logger = container.resolve(_utils.ContainerRegistrationKeys.LOGGER);
    const remoteLink = container.resolve(_utils.ContainerRegistrationKeys.REMOTE_LINK);
    const fulfillmentModuleService = container.resolve(_utils.ModuleRegistrationName.FULFILLMENT);
    const salesChannelModuleService = container.resolve(_utils.ModuleRegistrationName.SALES_CHANNEL);
    const storeModuleService = container.resolve(_utils.ModuleRegistrationName.STORE);
    const countries = [
        "gb",
        "de",
        "dk",
        "se",
        "fr",
        "es",
        "it"
    ];
    logger.info("Seeding store data...");
    const [store] = await storeModuleService.listStores();
    let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
        name: "Default Sales Channel"
    });
    if (!defaultSalesChannel.length) {
        // create the default sales channel
        const { result: salesChannelResult } = await (0, _coreflows.createSalesChannelsWorkflow)(container).run({
            input: {
                salesChannelsData: [
                    {
                        name: "Default Sales Channel"
                    }
                ]
            }
        });
        defaultSalesChannel = salesChannelResult;
    }
    await (0, _coreflows.updateStoresWorkflow)(container).run({
        input: {
            selector: {
                id: store.id
            },
            update: {
                supported_currencies: [
                    {
                        currency_code: "eur",
                        is_default: true
                    },
                    {
                        currency_code: "usd"
                    }
                ],
                default_sales_channel_id: defaultSalesChannel[0].id
            }
        }
    });
    logger.info("Seeding region data...");
    const { result: regionResult } = await (0, _coreflows.createRegionsWorkflow)(container).run({
        input: {
            regions: [
                {
                    name: "Europe",
                    currency_code: "eur",
                    countries,
                    payment_providers: [
                        "pp_system_default"
                    ]
                }
            ]
        }
    });
    const region = regionResult[0];
    logger.info("Finished seeding regions.");
    logger.info("Seeding tax regions...");
    await (0, _coreflows.createTaxRegionsWorkflow)(container).run({
        input: countries.map((country_code)=>({
                country_code
            }))
    });
    logger.info("Finished seeding tax regions.");
    logger.info("Seeding fulfillment data...");
    const { result: shippingProfileResult } = await (0, _coreflows.createShippingProfilesWorkflow)(container).run({
        input: {
            data: [
                {
                    name: "Default",
                    type: "default"
                }
            ]
        }
    });
    const shippingProfile = shippingProfileResult[0];
    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "European Warehouse delivery",
        type: "delivery",
        service_zones: [
            {
                name: "Europe",
                geo_zones: [
                    {
                        country_code: "gb",
                        type: "country"
                    },
                    {
                        country_code: "de",
                        type: "country"
                    },
                    {
                        country_code: "dk",
                        type: "country"
                    },
                    {
                        country_code: "se",
                        type: "country"
                    },
                    {
                        country_code: "fr",
                        type: "country"
                    },
                    {
                        country_code: "es",
                        type: "country"
                    },
                    {
                        country_code: "it",
                        type: "country"
                    }
                ]
            }
        ]
    });
    await (0, _coreflows.createShippingOptionsWorkflow)(container).run({
        input: [
            {
                name: "Standard Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: {
                    label: "Standard",
                    description: "Ship in 2-3 days.",
                    code: "standard"
                },
                prices: [
                    {
                        currency_code: "usd",
                        amount: 10
                    },
                    {
                        currency_code: "eur",
                        amount: 10
                    },
                    {
                        region_id: region.id,
                        amount: 10
                    }
                ],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: '"true"',
                        operator: "eq"
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq"
                    }
                ]
            },
            {
                name: "Express Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: {
                    label: "Express",
                    description: "Ship in 24 hours.",
                    code: "express"
                },
                prices: [
                    {
                        currency_code: "usd",
                        amount: 10
                    },
                    {
                        currency_code: "eur",
                        amount: 10
                    },
                    {
                        region_id: region.id,
                        amount: 10
                    }
                ],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: '"true"',
                        operator: "eq"
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq"
                    }
                ]
            }
        ]
    });
    logger.info("Finished seeding fulfillment data.");
    logger.info("Seeding stock location data...");
    const { result: stockLocationResult } = await (0, _coreflows.createStockLocationsWorkflow)(container).run({
        input: {
            locations: [
                {
                    name: "European Warehouse",
                    address: {
                        city: "Copenhagen",
                        country_code: "DK",
                        address_1: ""
                    }
                }
            ]
        }
    });
    const stockLocation = stockLocationResult[0];
    await (0, _coreflows.linkSalesChannelsToStockLocationWorkflow)(container).run({
        input: {
            id: stockLocation.id,
            add: [
                defaultSalesChannel[0].id
            ]
        }
    });
    await remoteLink.create({
        [_utils.Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id
        },
        [_utils.Modules.FULFILLMENT]: {
            fulfillment_set_id: fulfillmentSet.id
        }
    });
    logger.info("Finished seeding stock location data.");
    logger.info("Seeding publishable API key data...");
    const { result: publishableApiKeyResult } = await (0, _coreflows.createApiKeysWorkflow)(container).run({
        input: {
            api_keys: [
                {
                    title: "Webshop",
                    type: "publishable",
                    created_by: ""
                }
            ]
        }
    });
    const publishableApiKey = publishableApiKeyResult[0];
    await (0, _coreflows.linkSalesChannelsToApiKeyWorkflow)(container).run({
        input: {
            id: publishableApiKey.id,
            add: [
                defaultSalesChannel[0].id
            ]
        }
    });
    logger.info("Finished seeding publishable API key data.");
    logger.info("Seeding product data...");
    const { result: categoryResult } = await (0, _coreflows.createProductCategoriesWorkflow)(container).run({
        input: {
            product_categories: [
                {
                    name: "Shirts",
                    is_active: true
                },
                {
                    name: "Sweatshirts",
                    is_active: true
                },
                {
                    name: "Pants",
                    is_active: true
                },
                {
                    name: "Merch",
                    is_active: true
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa T-Shirt",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Shirts").id
                    ],
                    description: "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
                    handle: "t-shirt",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        },
                        {
                            title: "Color",
                            values: [
                                "Black",
                                "White"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S / Black",
                            sku: "SHIRT-S-BLACK",
                            options: {
                                Size: "S",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "S / White",
                            sku: "SHIRT-S-WHITE",
                            options: {
                                Size: "S",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M / Black",
                            sku: "SHIRT-M-BLACK",
                            options: {
                                Size: "M",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M / White",
                            sku: "SHIRT-M-WHITE",
                            options: {
                                Size: "M",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L / Black",
                            sku: "SHIRT-L-BLACK",
                            options: {
                                Size: "L",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L / White",
                            sku: "SHIRT-L-WHITE",
                            options: {
                                Size: "L",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL / Black",
                            sku: "SHIRT-XL-BLACK",
                            options: {
                                Size: "XL",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL / White",
                            sku: "SHIRT-XL-WHITE",
                            options: {
                                Size: "XL",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa Sweatshirt",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Sweatshirts").id
                    ],
                    description: "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
                    handle: "sweatshirt",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S",
                            sku: "SWEATSHIRT-S",
                            options: {
                                Size: "S"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M",
                            sku: "SWEATSHIRT-M",
                            options: {
                                Size: "M"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L",
                            sku: "SWEATSHIRT-L",
                            options: {
                                Size: "L"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL",
                            sku: "SWEATSHIRT-XL",
                            options: {
                                Size: "XL"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa Sweatpants",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Pants").id
                    ],
                    description: "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
                    handle: "sweatpants",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S",
                            sku: "SWEATPANTS-S",
                            options: {
                                Size: "S"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M",
                            sku: "SWEATPANTS-M",
                            options: {
                                Size: "M"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L",
                            sku: "SWEATPANTS-L",
                            options: {
                                Size: "L"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL",
                            sku: "SWEATPANTS-XL",
                            options: {
                                Size: "XL"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa Shorts",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Merch").id
                    ],
                    description: "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
                    handle: "shorts",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S",
                            sku: "SHORTS-S",
                            options: {
                                Size: "S"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M",
                            sku: "SHORTS-M",
                            options: {
                                Size: "M"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L",
                            sku: "SHORTS-L",
                            options: {
                                Size: "L"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL",
                            sku: "SHORTS-XL",
                            options: {
                                Size: "XL"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    logger.info("Finished seeding product data.");
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JpcHRzL3NlZWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgY3JlYXRlQXBpS2V5c1dvcmtmbG93LFxuICBjcmVhdGVQcm9kdWN0Q2F0ZWdvcmllc1dvcmtmbG93LFxuICBjcmVhdGVQcm9kdWN0c1dvcmtmbG93LFxuICBjcmVhdGVSZWdpb25zV29ya2Zsb3csXG4gIGNyZWF0ZVNhbGVzQ2hhbm5lbHNXb3JrZmxvdyxcbiAgY3JlYXRlU2hpcHBpbmdPcHRpb25zV29ya2Zsb3csXG4gIGNyZWF0ZVNoaXBwaW5nUHJvZmlsZXNXb3JrZmxvdyxcbiAgY3JlYXRlU3RvY2tMb2NhdGlvbnNXb3JrZmxvdyxcbiAgY3JlYXRlVGF4UmVnaW9uc1dvcmtmbG93LFxuICBsaW5rU2FsZXNDaGFubmVsc1RvQXBpS2V5V29ya2Zsb3csXG4gIGxpbmtTYWxlc0NoYW5uZWxzVG9TdG9ja0xvY2F0aW9uV29ya2Zsb3csXG4gIHVwZGF0ZVN0b3Jlc1dvcmtmbG93LFxufSBmcm9tIFwiQG1lZHVzYWpzL2NvcmUtZmxvd3NcIjtcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJAbWVkdXNhanMvbWVkdXNhXCI7XG5pbXBvcnQgeyBSZW1vdGVMaW5rIH0gZnJvbSBcIkBtZWR1c2Fqcy9tb2R1bGVzLXNka1wiO1xuaW1wb3J0IHtcbiAgRXhlY0FyZ3MsXG4gIElGdWxmaWxsbWVudE1vZHVsZVNlcnZpY2UsXG4gIElTYWxlc0NoYW5uZWxNb2R1bGVTZXJ2aWNlLFxuICBJU3RvcmVNb2R1bGVTZXJ2aWNlLFxufSBmcm9tIFwiQG1lZHVzYWpzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBDb250YWluZXJSZWdpc3RyYXRpb25LZXlzLFxuICBNb2R1bGVzLFxuICBQcm9kdWN0U3RhdHVzLFxuICBNb2R1bGVSZWdpc3RyYXRpb25OYW1lXG59IGZyb20gXCJAbWVkdXNhanMvdXRpbHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gc2VlZERlbW9EYXRhKHsgY29udGFpbmVyIH06IEV4ZWNBcmdzKSB7XG4gIGNvbnN0IGxvZ2dlcjogTG9nZ2VyID0gY29udGFpbmVyLnJlc29sdmUoQ29udGFpbmVyUmVnaXN0cmF0aW9uS2V5cy5MT0dHRVIpO1xuICBjb25zdCByZW1vdGVMaW5rOiBSZW1vdGVMaW5rID0gY29udGFpbmVyLnJlc29sdmUoXG4gICAgQ29udGFpbmVyUmVnaXN0cmF0aW9uS2V5cy5SRU1PVEVfTElOS1xuICApO1xuICBjb25zdCBmdWxmaWxsbWVudE1vZHVsZVNlcnZpY2U6IElGdWxmaWxsbWVudE1vZHVsZVNlcnZpY2UgPSBjb250YWluZXIucmVzb2x2ZShcbiAgICBNb2R1bGVSZWdpc3RyYXRpb25OYW1lLkZVTEZJTExNRU5UXG4gICk7XG4gIGNvbnN0IHNhbGVzQ2hhbm5lbE1vZHVsZVNlcnZpY2U6IElTYWxlc0NoYW5uZWxNb2R1bGVTZXJ2aWNlID1cbiAgICBjb250YWluZXIucmVzb2x2ZShNb2R1bGVSZWdpc3RyYXRpb25OYW1lLlNBTEVTX0NIQU5ORUwpO1xuICBjb25zdCBzdG9yZU1vZHVsZVNlcnZpY2U6IElTdG9yZU1vZHVsZVNlcnZpY2UgPSBjb250YWluZXIucmVzb2x2ZShcbiAgICBNb2R1bGVSZWdpc3RyYXRpb25OYW1lLlNUT1JFXG4gICk7XG5cbiAgY29uc3QgY291bnRyaWVzID0gW1wiZ2JcIiwgXCJkZVwiLCBcImRrXCIsIFwic2VcIiwgXCJmclwiLCBcImVzXCIsIFwiaXRcIl07XG5cbiAgbG9nZ2VyLmluZm8oXCJTZWVkaW5nIHN0b3JlIGRhdGEuLi5cIik7XG4gIGNvbnN0IFtzdG9yZV0gPSBhd2FpdCBzdG9yZU1vZHVsZVNlcnZpY2UubGlzdFN0b3JlcygpO1xuICBsZXQgZGVmYXVsdFNhbGVzQ2hhbm5lbCA9IGF3YWl0IHNhbGVzQ2hhbm5lbE1vZHVsZVNlcnZpY2UubGlzdFNhbGVzQ2hhbm5lbHMoe1xuICAgIG5hbWU6IFwiRGVmYXVsdCBTYWxlcyBDaGFubmVsXCIsXG4gIH0pO1xuXG4gIGlmICghZGVmYXVsdFNhbGVzQ2hhbm5lbC5sZW5ndGgpIHtcbiAgICAvLyBjcmVhdGUgdGhlIGRlZmF1bHQgc2FsZXMgY2hhbm5lbFxuICAgIGNvbnN0IHsgcmVzdWx0OiBzYWxlc0NoYW5uZWxSZXN1bHQgfSA9IGF3YWl0IGNyZWF0ZVNhbGVzQ2hhbm5lbHNXb3JrZmxvdyhcbiAgICAgIGNvbnRhaW5lclxuICAgICkucnVuKHtcbiAgICAgIGlucHV0OiB7XG4gICAgICAgIHNhbGVzQ2hhbm5lbHNEYXRhOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogXCJEZWZhdWx0IFNhbGVzIENoYW5uZWxcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBkZWZhdWx0U2FsZXNDaGFubmVsID0gc2FsZXNDaGFubmVsUmVzdWx0O1xuICB9XG5cbiAgYXdhaXQgdXBkYXRlU3RvcmVzV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiB7XG4gICAgICBzZWxlY3RvcjogeyBpZDogc3RvcmUuaWQgfSxcbiAgICAgIHVwZGF0ZToge1xuICAgICAgICBzdXBwb3J0ZWRfY3VycmVuY2llczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICBpc19kZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0X3NhbGVzX2NoYW5uZWxfaWQ6IGRlZmF1bHRTYWxlc0NoYW5uZWxbMF0uaWQsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuICBsb2dnZXIuaW5mbyhcIlNlZWRpbmcgcmVnaW9uIGRhdGEuLi5cIik7XG4gIGNvbnN0IHsgcmVzdWx0OiByZWdpb25SZXN1bHQgfSA9IGF3YWl0IGNyZWF0ZVJlZ2lvbnNXb3JrZmxvdyhjb250YWluZXIpLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIHJlZ2lvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiRXVyb3BlXCIsXG4gICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICBjb3VudHJpZXMsXG4gICAgICAgICAgcGF5bWVudF9wcm92aWRlcnM6IFtcInBwX3N5c3RlbV9kZWZhdWx0XCJdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgcmVnaW9uID0gcmVnaW9uUmVzdWx0WzBdO1xuICBsb2dnZXIuaW5mbyhcIkZpbmlzaGVkIHNlZWRpbmcgcmVnaW9ucy5cIik7XG5cbiAgbG9nZ2VyLmluZm8oXCJTZWVkaW5nIHRheCByZWdpb25zLi4uXCIpO1xuICBhd2FpdCBjcmVhdGVUYXhSZWdpb25zV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiBjb3VudHJpZXMubWFwKChjb3VudHJ5X2NvZGUpID0+ICh7XG4gICAgICBjb3VudHJ5X2NvZGUsXG4gICAgfSkpLFxuICB9KTtcbiAgbG9nZ2VyLmluZm8oXCJGaW5pc2hlZCBzZWVkaW5nIHRheCByZWdpb25zLlwiKTtcblxuICBsb2dnZXIuaW5mbyhcIlNlZWRpbmcgZnVsZmlsbG1lbnQgZGF0YS4uLlwiKTtcbiAgY29uc3QgeyByZXN1bHQ6IHNoaXBwaW5nUHJvZmlsZVJlc3VsdCB9ID1cbiAgICBhd2FpdCBjcmVhdGVTaGlwcGluZ1Byb2ZpbGVzV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgICAgaW5wdXQ6IHtcbiAgICAgICAgZGF0YTogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwiRGVmYXVsdFwiLFxuICAgICAgICAgICAgdHlwZTogXCJkZWZhdWx0XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIGNvbnN0IHNoaXBwaW5nUHJvZmlsZSA9IHNoaXBwaW5nUHJvZmlsZVJlc3VsdFswXTtcblxuICBjb25zdCBmdWxmaWxsbWVudFNldCA9IGF3YWl0IGZ1bGZpbGxtZW50TW9kdWxlU2VydmljZS5jcmVhdGVGdWxmaWxsbWVudFNldHMoe1xuICAgIG5hbWU6IFwiRXVyb3BlYW4gV2FyZWhvdXNlIGRlbGl2ZXJ5XCIsXG4gICAgdHlwZTogXCJkZWxpdmVyeVwiLFxuICAgIHNlcnZpY2Vfem9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJFdXJvcGVcIixcbiAgICAgICAgZ2VvX3pvbmVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY291bnRyeV9jb2RlOiBcImdiXCIsXG4gICAgICAgICAgICB0eXBlOiBcImNvdW50cnlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvdW50cnlfY29kZTogXCJkZVwiLFxuICAgICAgICAgICAgdHlwZTogXCJjb3VudHJ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb3VudHJ5X2NvZGU6IFwiZGtcIixcbiAgICAgICAgICAgIHR5cGU6IFwiY291bnRyeVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY291bnRyeV9jb2RlOiBcInNlXCIsXG4gICAgICAgICAgICB0eXBlOiBcImNvdW50cnlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvdW50cnlfY29kZTogXCJmclwiLFxuICAgICAgICAgICAgdHlwZTogXCJjb3VudHJ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb3VudHJ5X2NvZGU6IFwiZXNcIixcbiAgICAgICAgICAgIHR5cGU6IFwiY291bnRyeVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY291bnRyeV9jb2RlOiBcIml0XCIsXG4gICAgICAgICAgICB0eXBlOiBcImNvdW50cnlcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcblxuICBhd2FpdCBjcmVhdGVTaGlwcGluZ09wdGlvbnNXb3JrZmxvdyhjb250YWluZXIpLnJ1bih7XG4gICAgaW5wdXQ6IFtcbiAgICAgIHtcbiAgICAgICAgbmFtZTogXCJTdGFuZGFyZCBTaGlwcGluZ1wiLFxuICAgICAgICBwcmljZV90eXBlOiBcImZsYXRcIixcbiAgICAgICAgcHJvdmlkZXJfaWQ6IFwibWFudWFsX21hbnVhbFwiLFxuICAgICAgICBzZXJ2aWNlX3pvbmVfaWQ6IGZ1bGZpbGxtZW50U2V0LnNlcnZpY2Vfem9uZXNbMF0uaWQsXG4gICAgICAgIHNoaXBwaW5nX3Byb2ZpbGVfaWQ6IHNoaXBwaW5nUHJvZmlsZS5pZCxcbiAgICAgICAgdHlwZToge1xuICAgICAgICAgIGxhYmVsOiBcIlN0YW5kYXJkXCIsXG4gICAgICAgICAgZGVzY3JpcHRpb246IFwiU2hpcCBpbiAyLTMgZGF5cy5cIixcbiAgICAgICAgICBjb2RlOiBcInN0YW5kYXJkXCIsXG4gICAgICAgIH0sXG4gICAgICAgIHByaWNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICByZWdpb25faWQ6IHJlZ2lvbi5pZCxcbiAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBhdHRyaWJ1dGU6IFwiZW5hYmxlZF9pbl9zdG9yZVwiLFxuICAgICAgICAgICAgdmFsdWU6ICdcInRydWVcIicsXG4gICAgICAgICAgICBvcGVyYXRvcjogXCJlcVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXR0cmlidXRlOiBcImlzX3JldHVyblwiLFxuICAgICAgICAgICAgdmFsdWU6IFwiZmFsc2VcIixcbiAgICAgICAgICAgIG9wZXJhdG9yOiBcImVxXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRXhwcmVzcyBTaGlwcGluZ1wiLFxuICAgICAgICBwcmljZV90eXBlOiBcImZsYXRcIixcbiAgICAgICAgcHJvdmlkZXJfaWQ6IFwibWFudWFsX21hbnVhbFwiLFxuICAgICAgICBzZXJ2aWNlX3pvbmVfaWQ6IGZ1bGZpbGxtZW50U2V0LnNlcnZpY2Vfem9uZXNbMF0uaWQsXG4gICAgICAgIHNoaXBwaW5nX3Byb2ZpbGVfaWQ6IHNoaXBwaW5nUHJvZmlsZS5pZCxcbiAgICAgICAgdHlwZToge1xuICAgICAgICAgIGxhYmVsOiBcIkV4cHJlc3NcIixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJTaGlwIGluIDI0IGhvdXJzLlwiLFxuICAgICAgICAgIGNvZGU6IFwiZXhwcmVzc1wiLFxuICAgICAgICB9LFxuICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgcmVnaW9uX2lkOiByZWdpb24uaWQsXG4gICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXR0cmlidXRlOiBcImVuYWJsZWRfaW5fc3RvcmVcIixcbiAgICAgICAgICAgIHZhbHVlOiAnXCJ0cnVlXCInLFxuICAgICAgICAgICAgb3BlcmF0b3I6IFwiZXFcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZTogXCJpc19yZXR1cm5cIixcbiAgICAgICAgICAgIHZhbHVlOiBcImZhbHNlXCIsXG4gICAgICAgICAgICBvcGVyYXRvcjogXCJlcVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIF0sXG4gIH0pO1xuICBsb2dnZXIuaW5mbyhcIkZpbmlzaGVkIHNlZWRpbmcgZnVsZmlsbG1lbnQgZGF0YS5cIik7XG5cbiAgbG9nZ2VyLmluZm8oXCJTZWVkaW5nIHN0b2NrIGxvY2F0aW9uIGRhdGEuLi5cIik7XG4gIGNvbnN0IHsgcmVzdWx0OiBzdG9ja0xvY2F0aW9uUmVzdWx0IH0gPSBhd2FpdCBjcmVhdGVTdG9ja0xvY2F0aW9uc1dvcmtmbG93KFxuICAgIGNvbnRhaW5lclxuICApLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIGxvY2F0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJFdXJvcGVhbiBXYXJlaG91c2VcIixcbiAgICAgICAgICBhZGRyZXNzOiB7XG4gICAgICAgICAgICBjaXR5OiBcIkNvcGVuaGFnZW5cIixcbiAgICAgICAgICAgIGNvdW50cnlfY29kZTogXCJES1wiLFxuICAgICAgICAgICAgYWRkcmVzc18xOiBcIlwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCBzdG9ja0xvY2F0aW9uID0gc3RvY2tMb2NhdGlvblJlc3VsdFswXTtcblxuICBhd2FpdCBsaW5rU2FsZXNDaGFubmVsc1RvU3RvY2tMb2NhdGlvbldvcmtmbG93KGNvbnRhaW5lcikucnVuKHtcbiAgICBpbnB1dDoge1xuICAgICAgaWQ6IHN0b2NrTG9jYXRpb24uaWQsXG4gICAgICBhZGQ6IFtkZWZhdWx0U2FsZXNDaGFubmVsWzBdLmlkXSxcbiAgICB9LFxuICB9KTtcblxuICBhd2FpdCByZW1vdGVMaW5rLmNyZWF0ZSh7XG4gICAgW01vZHVsZXMuU1RPQ0tfTE9DQVRJT05dOiB7XG4gICAgICBzdG9ja19sb2NhdGlvbl9pZDogc3RvY2tMb2NhdGlvbi5pZCxcbiAgICB9LFxuICAgIFtNb2R1bGVzLkZVTEZJTExNRU5UXToge1xuICAgICAgZnVsZmlsbG1lbnRfc2V0X2lkOiBmdWxmaWxsbWVudFNldC5pZCxcbiAgICB9LFxuICB9KTtcbiAgbG9nZ2VyLmluZm8oXCJGaW5pc2hlZCBzZWVkaW5nIHN0b2NrIGxvY2F0aW9uIGRhdGEuXCIpO1xuXG4gIGxvZ2dlci5pbmZvKFwiU2VlZGluZyBwdWJsaXNoYWJsZSBBUEkga2V5IGRhdGEuLi5cIik7XG4gIGNvbnN0IHsgcmVzdWx0OiBwdWJsaXNoYWJsZUFwaUtleVJlc3VsdCB9ID0gYXdhaXQgY3JlYXRlQXBpS2V5c1dvcmtmbG93KFxuICAgIGNvbnRhaW5lclxuICApLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIGFwaV9rZXlzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogXCJXZWJzaG9wXCIsXG4gICAgICAgICAgdHlwZTogXCJwdWJsaXNoYWJsZVwiLFxuICAgICAgICAgIGNyZWF0ZWRfYnk6IFwiXCIsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCBwdWJsaXNoYWJsZUFwaUtleSA9IHB1Ymxpc2hhYmxlQXBpS2V5UmVzdWx0WzBdO1xuXG4gIGF3YWl0IGxpbmtTYWxlc0NoYW5uZWxzVG9BcGlLZXlXb3JrZmxvdyhjb250YWluZXIpLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIGlkOiBwdWJsaXNoYWJsZUFwaUtleS5pZCxcbiAgICAgIGFkZDogW2RlZmF1bHRTYWxlc0NoYW5uZWxbMF0uaWRdLFxuICAgIH0sXG4gIH0pO1xuICBsb2dnZXIuaW5mbyhcIkZpbmlzaGVkIHNlZWRpbmcgcHVibGlzaGFibGUgQVBJIGtleSBkYXRhLlwiKTtcblxuICBsb2dnZXIuaW5mbyhcIlNlZWRpbmcgcHJvZHVjdCBkYXRhLi4uXCIpO1xuXG4gIGNvbnN0IHsgcmVzdWx0OiBjYXRlZ29yeVJlc3VsdCB9ID0gYXdhaXQgY3JlYXRlUHJvZHVjdENhdGVnb3JpZXNXb3JrZmxvdyhcbiAgICBjb250YWluZXJcbiAgKS5ydW4oe1xuICAgIGlucHV0OiB7XG4gICAgICBwcm9kdWN0X2NhdGVnb3JpZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiU2hpcnRzXCIsXG4gICAgICAgICAgaXNfYWN0aXZlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJTd2VhdHNoaXJ0c1wiLFxuICAgICAgICAgIGlzX2FjdGl2ZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiUGFudHNcIixcbiAgICAgICAgICBpc19hY3RpdmU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIk1lcmNoXCIsXG4gICAgICAgICAgaXNfYWN0aXZlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcblxuICBhd2FpdCBjcmVhdGVQcm9kdWN0c1dvcmtmbG93KGNvbnRhaW5lcikucnVuKHtcbiAgICBpbnB1dDoge1xuICAgICAgcHJvZHVjdHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiBcIk1lZHVzYSBULVNoaXJ0XCIsXG4gICAgICAgICAgY2F0ZWdvcnlfaWRzOiBbXG4gICAgICAgICAgICBjYXRlZ29yeVJlc3VsdC5maW5kKChjYXQpID0+IGNhdC5uYW1lID09PSBcIlNoaXJ0c1wiKS5pZCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgXCJSZWltYWdpbmUgdGhlIGZlZWxpbmcgb2YgYSBjbGFzc2ljIFQtc2hpcnQuIFdpdGggb3VyIGNvdHRvbiBULXNoaXJ0cywgZXZlcnlkYXkgZXNzZW50aWFscyBubyBsb25nZXIgaGF2ZSB0byBiZSBvcmRpbmFyeS5cIixcbiAgICAgICAgICBoYW5kbGU6IFwidC1zaGlydFwiLFxuICAgICAgICAgIHdlaWdodDogNDAwLFxuICAgICAgICAgIHN0YXR1czogUHJvZHVjdFN0YXR1cy5QVUJMSVNIRUQsXG4gICAgICAgICAgaW1hZ2VzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL21lZHVzYS1wdWJsaWMtaW1hZ2VzLnMzLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tL3RlZS1ibGFjay1mcm9udC5wbmdcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL21lZHVzYS1wdWJsaWMtaW1hZ2VzLnMzLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tL3RlZS1ibGFjay1iYWNrLnBuZ1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbWVkdXNhLXB1YmxpYy1pbWFnZXMuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vdGVlLXdoaXRlLWZyb250LnBuZ1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbWVkdXNhLXB1YmxpYy1pbWFnZXMuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vdGVlLXdoaXRlLWJhY2sucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTaXplXCIsXG4gICAgICAgICAgICAgIHZhbHVlczogW1wiU1wiLCBcIk1cIiwgXCJMXCIsIFwiWExcIl0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJDb2xvclwiLFxuICAgICAgICAgICAgICB2YWx1ZXM6IFtcIkJsYWNrXCIsIFwiV2hpdGVcIl0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgdmFyaWFudHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUyAvIEJsYWNrXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1TLUJMQUNLXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIlNcIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJCbGFja1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiUyAvIFdoaXRlXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1TLVdISVRFXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIlNcIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJXaGl0ZVwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTSAvIEJsYWNrXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1NLUJMQUNLXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIk1cIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJCbGFja1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTSAvIFdoaXRlXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1NLVdISVRFXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIk1cIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJXaGl0ZVwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTCAvIEJsYWNrXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1MLUJMQUNLXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIkxcIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJCbGFja1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTCAvIFdoaXRlXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1MLVdISVRFXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIkxcIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJXaGl0ZVwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiWEwgLyBCbGFja1wiLFxuICAgICAgICAgICAgICBza3U6IFwiU0hJUlQtWEwtQkxBQ0tcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiWExcIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJCbGFja1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiWEwgLyBXaGl0ZVwiLFxuICAgICAgICAgICAgICBza3U6IFwiU0hJUlQtWEwtV0hJVEVcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiWExcIixcbiAgICAgICAgICAgICAgICBDb2xvcjogXCJXaGl0ZVwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNhbGVzX2NoYW5uZWxzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlkOiBkZWZhdWx0U2FsZXNDaGFubmVsWzBdLmlkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcbiAgYXdhaXQgY3JlYXRlUHJvZHVjdHNXb3JrZmxvdyhjb250YWluZXIpLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIHByb2R1Y3RzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogXCJNZWR1c2EgU3dlYXRzaGlydFwiLFxuICAgICAgICAgIGNhdGVnb3J5X2lkczogW1xuICAgICAgICAgICAgY2F0ZWdvcnlSZXN1bHQuZmluZCgoY2F0KSA9PiBjYXQubmFtZSA9PT0gXCJTd2VhdHNoaXJ0c1wiKS5pZCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgXCJSZWltYWdpbmUgdGhlIGZlZWxpbmcgb2YgYSBjbGFzc2ljIHN3ZWF0c2hpcnQuIFdpdGggb3VyIGNvdHRvbiBzd2VhdHNoaXJ0LCBldmVyeWRheSBlc3NlbnRpYWxzIG5vIGxvbmdlciBoYXZlIHRvIGJlIG9yZGluYXJ5LlwiLFxuICAgICAgICAgIGhhbmRsZTogXCJzd2VhdHNoaXJ0XCIsXG4gICAgICAgICAgd2VpZ2h0OiA0MDAsXG4gICAgICAgICAgc3RhdHVzOiBQcm9kdWN0U3RhdHVzLlBVQkxJU0hFRCxcbiAgICAgICAgICBpbWFnZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbWVkdXNhLXB1YmxpYy1pbWFnZXMuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vc3dlYXRzaGlydC12aW50YWdlLWZyb250LnBuZ1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbWVkdXNhLXB1YmxpYy1pbWFnZXMuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vc3dlYXRzaGlydC12aW50YWdlLWJhY2sucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTaXplXCIsXG4gICAgICAgICAgICAgIHZhbHVlczogW1wiU1wiLCBcIk1cIiwgXCJMXCIsIFwiWExcIl0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgdmFyaWFudHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU1wiLFxuICAgICAgICAgICAgICBza3U6IFwiU1dFQVRTSElSVC1TXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIlNcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIk1cIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNXRUFUU0hJUlQtTVwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJNXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJMXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTV0VBVFNISVJULUxcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiWExcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNXRUFUU0hJUlQtWExcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiWExcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBzYWxlc19jaGFubmVsczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZDogZGVmYXVsdFNhbGVzQ2hhbm5lbFswXS5pZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG4gIGF3YWl0IGNyZWF0ZVByb2R1Y3RzV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiB7XG4gICAgICBwcm9kdWN0czogW1xuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6IFwiTWVkdXNhIFN3ZWF0cGFudHNcIixcbiAgICAgICAgICBjYXRlZ29yeV9pZHM6IFtjYXRlZ29yeVJlc3VsdC5maW5kKChjYXQpID0+IGNhdC5uYW1lID09PSBcIlBhbnRzXCIpLmlkXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgIFwiUmVpbWFnaW5lIHRoZSBmZWVsaW5nIG9mIGNsYXNzaWMgc3dlYXRwYW50cy4gV2l0aCBvdXIgY290dG9uIHN3ZWF0cGFudHMsIGV2ZXJ5ZGF5IGVzc2VudGlhbHMgbm8gbG9uZ2VyIGhhdmUgdG8gYmUgb3JkaW5hcnkuXCIsXG4gICAgICAgICAgaGFuZGxlOiBcInN3ZWF0cGFudHNcIixcbiAgICAgICAgICB3ZWlnaHQ6IDQwMCxcbiAgICAgICAgICBzdGF0dXM6IFByb2R1Y3RTdGF0dXMuUFVCTElTSEVELFxuICAgICAgICAgIGltYWdlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS9zd2VhdHBhbnRzLWdyYXktZnJvbnQucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS9zd2VhdHBhbnRzLWdyYXktYmFjay5wbmdcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBvcHRpb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNpemVcIixcbiAgICAgICAgICAgICAgdmFsdWVzOiBbXCJTXCIsIFwiTVwiLCBcIkxcIiwgXCJYTFwiXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTV0VBVFBBTlRTLVNcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiU1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTVwiLFxuICAgICAgICAgICAgICBza3U6IFwiU1dFQVRQQU5UUy1NXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIk1cIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkxcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNXRUFUUEFOVFMtTFwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJMXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJYTFwiLFxuICAgICAgICAgICAgICBza3U6IFwiU1dFQVRQQU5UUy1YTFwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJYTFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNhbGVzX2NoYW5uZWxzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlkOiBkZWZhdWx0U2FsZXNDaGFubmVsWzBdLmlkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcbiAgYXdhaXQgY3JlYXRlUHJvZHVjdHNXb3JrZmxvdyhjb250YWluZXIpLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIHByb2R1Y3RzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogXCJNZWR1c2EgU2hvcnRzXCIsXG4gICAgICAgICAgY2F0ZWdvcnlfaWRzOiBbY2F0ZWdvcnlSZXN1bHQuZmluZCgoY2F0KSA9PiBjYXQubmFtZSA9PT0gXCJNZXJjaFwiKS5pZF0sXG4gICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICBcIlJlaW1hZ2luZSB0aGUgZmVlbGluZyBvZiBjbGFzc2ljIHNob3J0cy4gV2l0aCBvdXIgY290dG9uIHNob3J0cywgZXZlcnlkYXkgZXNzZW50aWFscyBubyBsb25nZXIgaGF2ZSB0byBiZSBvcmRpbmFyeS5cIixcbiAgICAgICAgICBoYW5kbGU6IFwic2hvcnRzXCIsXG4gICAgICAgICAgd2VpZ2h0OiA0MDAsXG4gICAgICAgICAgc3RhdHVzOiBQcm9kdWN0U3RhdHVzLlBVQkxJU0hFRCxcbiAgICAgICAgICBpbWFnZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbWVkdXNhLXB1YmxpYy1pbWFnZXMuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vc2hvcnRzLXZpbnRhZ2UtZnJvbnQucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS9zaG9ydHMtdmludGFnZS1iYWNrLnBuZ1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU2l6ZVwiLFxuICAgICAgICAgICAgICB2YWx1ZXM6IFtcIlNcIiwgXCJNXCIsIFwiTFwiLCBcIlhMXCJdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHZhcmlhbnRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNIT1JUUy1TXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIlNcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIk1cIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNIT1JUUy1NXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIk1cIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkxcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNIT1JUUy1MXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIkxcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlhMXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSE9SVFMtWExcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiWExcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBzYWxlc19jaGFubmVsczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZDogZGVmYXVsdFNhbGVzQ2hhbm5lbFswXS5pZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG4gIGxvZ2dlci5pbmZvKFwiRmluaXNoZWQgc2VlZGluZyBwcm9kdWN0IGRhdGEuXCIpO1xufVxuIl0sIm5hbWVzIjpbInNlZWREZW1vRGF0YSIsImNvbnRhaW5lciIsImxvZ2dlciIsInJlc29sdmUiLCJDb250YWluZXJSZWdpc3RyYXRpb25LZXlzIiwiTE9HR0VSIiwicmVtb3RlTGluayIsIlJFTU9URV9MSU5LIiwiZnVsZmlsbG1lbnRNb2R1bGVTZXJ2aWNlIiwiTW9kdWxlUmVnaXN0cmF0aW9uTmFtZSIsIkZVTEZJTExNRU5UIiwic2FsZXNDaGFubmVsTW9kdWxlU2VydmljZSIsIlNBTEVTX0NIQU5ORUwiLCJzdG9yZU1vZHVsZVNlcnZpY2UiLCJTVE9SRSIsImNvdW50cmllcyIsImluZm8iLCJzdG9yZSIsImxpc3RTdG9yZXMiLCJkZWZhdWx0U2FsZXNDaGFubmVsIiwibGlzdFNhbGVzQ2hhbm5lbHMiLCJuYW1lIiwibGVuZ3RoIiwicmVzdWx0Iiwic2FsZXNDaGFubmVsUmVzdWx0IiwiY3JlYXRlU2FsZXNDaGFubmVsc1dvcmtmbG93IiwicnVuIiwiaW5wdXQiLCJzYWxlc0NoYW5uZWxzRGF0YSIsInVwZGF0ZVN0b3Jlc1dvcmtmbG93Iiwic2VsZWN0b3IiLCJpZCIsInVwZGF0ZSIsInN1cHBvcnRlZF9jdXJyZW5jaWVzIiwiY3VycmVuY3lfY29kZSIsImlzX2RlZmF1bHQiLCJkZWZhdWx0X3NhbGVzX2NoYW5uZWxfaWQiLCJyZWdpb25SZXN1bHQiLCJjcmVhdGVSZWdpb25zV29ya2Zsb3ciLCJyZWdpb25zIiwicGF5bWVudF9wcm92aWRlcnMiLCJyZWdpb24iLCJjcmVhdGVUYXhSZWdpb25zV29ya2Zsb3ciLCJtYXAiLCJjb3VudHJ5X2NvZGUiLCJzaGlwcGluZ1Byb2ZpbGVSZXN1bHQiLCJjcmVhdGVTaGlwcGluZ1Byb2ZpbGVzV29ya2Zsb3ciLCJkYXRhIiwidHlwZSIsInNoaXBwaW5nUHJvZmlsZSIsImZ1bGZpbGxtZW50U2V0IiwiY3JlYXRlRnVsZmlsbG1lbnRTZXRzIiwic2VydmljZV96b25lcyIsImdlb196b25lcyIsImNyZWF0ZVNoaXBwaW5nT3B0aW9uc1dvcmtmbG93IiwicHJpY2VfdHlwZSIsInByb3ZpZGVyX2lkIiwic2VydmljZV96b25lX2lkIiwic2hpcHBpbmdfcHJvZmlsZV9pZCIsImxhYmVsIiwiZGVzY3JpcHRpb24iLCJjb2RlIiwicHJpY2VzIiwiYW1vdW50IiwicmVnaW9uX2lkIiwicnVsZXMiLCJhdHRyaWJ1dGUiLCJ2YWx1ZSIsIm9wZXJhdG9yIiwic3RvY2tMb2NhdGlvblJlc3VsdCIsImNyZWF0ZVN0b2NrTG9jYXRpb25zV29ya2Zsb3ciLCJsb2NhdGlvbnMiLCJhZGRyZXNzIiwiY2l0eSIsImFkZHJlc3NfMSIsInN0b2NrTG9jYXRpb24iLCJsaW5rU2FsZXNDaGFubmVsc1RvU3RvY2tMb2NhdGlvbldvcmtmbG93IiwiYWRkIiwiY3JlYXRlIiwiTW9kdWxlcyIsIlNUT0NLX0xPQ0FUSU9OIiwic3RvY2tfbG9jYXRpb25faWQiLCJmdWxmaWxsbWVudF9zZXRfaWQiLCJwdWJsaXNoYWJsZUFwaUtleVJlc3VsdCIsImNyZWF0ZUFwaUtleXNXb3JrZmxvdyIsImFwaV9rZXlzIiwidGl0bGUiLCJjcmVhdGVkX2J5IiwicHVibGlzaGFibGVBcGlLZXkiLCJsaW5rU2FsZXNDaGFubmVsc1RvQXBpS2V5V29ya2Zsb3ciLCJjYXRlZ29yeVJlc3VsdCIsImNyZWF0ZVByb2R1Y3RDYXRlZ29yaWVzV29ya2Zsb3ciLCJwcm9kdWN0X2NhdGVnb3JpZXMiLCJpc19hY3RpdmUiLCJjcmVhdGVQcm9kdWN0c1dvcmtmbG93IiwicHJvZHVjdHMiLCJjYXRlZ29yeV9pZHMiLCJmaW5kIiwiY2F0IiwiaGFuZGxlIiwid2VpZ2h0Iiwic3RhdHVzIiwiUHJvZHVjdFN0YXR1cyIsIlBVQkxJU0hFRCIsImltYWdlcyIsInVybCIsIm9wdGlvbnMiLCJ2YWx1ZXMiLCJ2YXJpYW50cyIsInNrdSIsIlNpemUiLCJDb2xvciIsIm1hbmFnZV9pbnZlbnRvcnkiLCJzYWxlc19jaGFubmVscyJdLCJyYW5nZU1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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