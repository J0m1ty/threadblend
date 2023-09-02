import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from 'src/structures';

const command: Command = {
    plugin: null,
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with pong!'),
    async execute(interaction: ChatInputCommandInteraction) {
        let time = Date.now();
        await interaction.reply({content: `Pinging...`, ephemeral: true });
        await interaction.editReply(`Pong! \`${Math.abs(Date.now() - time)}ms\``);
    },
};

export = command;