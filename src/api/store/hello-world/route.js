import { MedusaRequest, MedusaResponse } from '@medusajs/medusa'
import HelloModuleService from '../../../modules/hello/service';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const helloModuleService: HelloModuleService = req.scope.resolve<HelloModuleService>(
        "helloModuleService"
    )
    console.log(helloModuleService.getMessage());
    res.json({
        message: "Hello world!",
    });
}
