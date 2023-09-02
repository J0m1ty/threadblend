import { Collection, GatewayIntentBits } from 'discord.js';
import { ExtendedClient } from './structures';
import { QuickDB } from 'quick.db';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';
import { token } from './config.json';

const client = new ExtendedClient({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ]
});

client.db = new QuickDB();

client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const eventPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
}

for (const file of eventFiles) {
    const filePath = join(eventPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args: any[]) => event.execute(...args));
    } else {
        client.on(event.name, (...args: any[]) => event.execute(...args));
    }
}

client.login(token);