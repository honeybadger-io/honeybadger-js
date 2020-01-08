import Vue from 'vue';

interface HoneybadgerVue {
    notify(...args: any[]): void;
    setContext<T extends object>(context: T): void;
    resetContext(): void;
}

declare module 'vue/types/vue' {
    interface Vue {
        $honeybadger: HoneybadgerVue;
    }
}
