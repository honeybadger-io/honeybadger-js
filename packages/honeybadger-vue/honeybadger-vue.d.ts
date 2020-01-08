import Vue from 'vue';

interface HoneybadgerVue {
    notify(...args: any[]): any;
    setContext<T extends object>(context: T): Honeybadger;
    resetContext(): Honeybadger;
}

declare module 'vue/types/vue' {
    interface Vue {
        $honeybadger: HoneybadgerVue;
    }
}
