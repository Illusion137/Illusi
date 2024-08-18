// A cache that expires.
export default class Cache extends Map {
    timeout: number
    constructor(timeout = 1000) {
        super();
        this.timeout = timeout;
    }
    setC(key: any, value: any) {
        if (this.has(key)) {
            clearTimeout(super.get(key).tid);
        }
        super.set(key, {
            tid: setTimeout(this.delete.bind(this, key), this.timeout).unref(),
            value,
        });
    }
    get(key: any) {
        let entry = super.get(key);
        if (entry) {
            return entry.value;
        }
        return null;
    }
    getOrSet(key: any, fn: () => any) {
        if (this.has(key)) {
            return this.get(key);
        } else {
            let value = fn();
            this.set(key, value);
            (async () => {
                try {
                    await value;
                } catch (err) {
                    this.delete(key);
                }
            })();
            return value;
        }
    }
    deleteC(key: any) {
        let entry = super.get(key);
        if (entry) {
            clearTimeout(entry.tid);
            super.delete(key);
        }
    }
    clear() {
        for (let entry of this.values()) {
            clearTimeout(entry.tid);
        }
        super.clear();
    }
};
