import { Context } from 'runed'

export class UseString {
    #current = $state<string | null>(null)

    constructor(str: string | null) {
        this.#current = str
    }

    set current(val) {
        this.#current = val
    }

    get current() {
        return this.#current
    }
}

export const newTokenContext = new Context<UseString>('new-token');