declare module "honeybadger-js" {
    interface Config {
        debug?: boolean;
        apiKey: string;
        revision?: string;
        host?: string;
        ssl?: boolean;
        projectRoot?: string;
        environment?: string;
        component?: string;
        action?: string;
        onerror?: boolean;
        disabled?: boolean;
        maxErrors?: number;
        ignorePatterns?: RegExp[];
        async?: boolean;
    }

    interface Notice {
        stack: any;
        name: string;
        message: string;
        url: string;
        project_root: string;
        environment: string;
        component: string;
        action: string;
        fingerprint: string;
        context: any;
        cookies?: string;
    }

    class Honeybadger {
        static apiKey: string;
        static configure(config: Config): Honeybadger;
        static context: any;
        static environment: string;
        static notify(...args: any[]): any;
        static onerror: boolean;
        static wrap<T extends Function>(func: T): T;
        static setContext<T extends Object>(context: T): Honeybadger;
        static resetContext(): Honeybadger;
        static beforeNotify(func: (notice?: Notice) => void): Honeybadger;
        static beforeNotifyHandlers: ((notice?: Notice) => void)[];
        static factory(config: Config): Honeybadger;
    }


    namespace Honeybadger {}
    export = Honeybadger;
}
