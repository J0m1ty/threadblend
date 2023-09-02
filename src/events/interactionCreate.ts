import { BaseInteraction } from "discord.js";
import { ExtendedClient, GuildData, UserData } from "src/structures";

module.exports = {
	name: 'interactionCreate',
    async execute(interaction: BaseInteraction) {
        if (interaction.isAutocomplete()) {
            const command = (interaction.client as ExtendedClient).commands.get(interaction.commandName);

            if (!command?.autocomplete) return;

            const focusedOption = interaction.options.getFocused(true);

            let choices = await command.autocomplete(focusedOption, interaction);

            const filtered = choices.filter((c) => c.toLowerCase().startsWith(focusedOption.value.toLowerCase()));

            await interaction.respond(filtered.map(c => ({ name: c, value: c }))).catch(console.error);

            return;
        }

        if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;
        
        const command = (interaction.client as ExtendedClient).commands.get(interaction.commandName);

        if (!command) return;

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

        if (!guild) {
            guild = {
                channels: {}
            };

            await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);
        }
        
        let channel = guild.channels[interaction.channelId];

        if (!channel) {
            guild.channels[interaction.channelId] = {
                plugins: []
            };

            await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);
        }

        let user: UserData | null = await (interaction.client as ExtendedClient).db.get(`users.${interaction.user.id}`);

        if (!user) {
            user = {
                alarms: [],
                joined: Date.now(),
                lastSeen: Date.now(),
                nmessages: 0
            }

            await (interaction.client as ExtendedClient).db.set(`users.${interaction.user.id}`, user);
        }
        
        if (command.plugin && !channel?.plugins.some(p => p.name === command.plugin)) {
            await interaction.reply({ content: `:x: That command requires the \`${command.plugin}\` plugin.`, ephemeral: true });
            return;
        }

        try {
            await command.execute(interaction);
        }
        catch (error) {
            console.error(error);

            await interaction.reply({ content: `There was an error while executing this command!`, ephemeral: true })
                .catch(ignored => console.log(`Double error was suppressed!`));
        }
    },
};