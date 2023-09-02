import { Message } from "discord.js";

type BuiltinTemplate<T> = {
    name: string;
    process: (message: T) => (T extends string ? boolean : Promise<boolean>);
} & (T extends string ? { usesString: true, usesMessage: false } : { usesMessage: true, usesString: false });

export type Builtin = BuiltinTemplate<Message> | BuiltinTemplate<string>;

export const builtins: Builtin[] = [
    {
        name: 'force-consecutive-numbering',
        process: async (message: Message) => {
            const lastMessage = await message.channel.messages.fetch({ limit: 2 }).then(messages => messages.last());

            if (!lastMessage) return true;
            
            const currentNumber = Number.parseInt(message.content);
            const lastNumber = Number.parseInt(lastMessage.content);
            
            if (Number.isNaN(currentNumber) || Number.isNaN(lastNumber)) {
                return false;
            }

            return currentNumber === lastNumber + 1;
        },
        usesMessage: true,
        usesString: false
    },
    {
        name: 'force-alternating-participants',
        process: async (message: Message) => {
            const lastMessage = await message.channel.messages.fetch({ limit: 2 }).then(messages => messages.last());

            if (!lastMessage) return true;

            return message.author.id !== lastMessage.author.id;
        },
        usesMessage: true,
        usesString: false
    },
    {
        name: 'one-word-max',
        process: (message: string) => {
            const regex = /^\w+$/;

            return regex.test(message);
        },
        usesString: true,
        usesMessage: false
    },
    {
        name: 'text-only',
        process: (message: string) => {
            const regex = /^[a-zA-Z]+$/;

            return regex.test(message);
        },
        usesString: true,
        usesMessage: false
    },
    {
        name: 'numbers-only',
        process: (message: Message | string) => {
            const regex = /^\d+$/;

            return regex.test(typeof message === 'string' ? message : message.content);
        },
        usesString: true,
        usesMessage: false
    },
    {
        name: 'text-and-numbers-only',
        process: (message: Message | string) => {
            const regex = /^[a-zA-Z0-9]+$/;

            return regex.test(typeof message === 'string' ? message : message.content);
        },
        usesString: true,
        usesMessage: false
    },
    {
        name: 'text-and-punctuation-only',
        process: (message: Message | string) => {
            const regex = /^[a-zA-Z\s.,\/#!$%\^&\*;:{}=\-_`~()]+$/;

            return regex.test(typeof message === 'string' ? message : message.content);
        },
        usesString: true,
        usesMessage: false
    },
]