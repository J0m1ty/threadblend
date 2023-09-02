import fs from 'node:fs';
import path from 'node:path';
import { REST, Routes } from 'discord.js';
import { clientId, token } from './config.json';

const globalCommands: string[] = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	globalCommands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
	try {
		console.log(`Started refreshing ${globalCommands.length} global application (/) commands.`);

		const data = await rest.put(Routes.applicationCommands(clientId), { body: globalCommands });

		console.log(`Successfully reloaded ${(data as { length: number }).length ?? "?"} global application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();

