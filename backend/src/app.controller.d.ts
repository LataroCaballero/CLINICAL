export declare class AppController {
    getHello(): {
        message: string;
    };
    health(): {
        status: string;
        service: string;
        version: string;
        timestamp: Date;
    };
}
