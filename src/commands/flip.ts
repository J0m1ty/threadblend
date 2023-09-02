import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from 'src/structures';

const command: Command = {
    plugin: null,
    data: new SlashCommandBuilder()
        .setName('flip')
        .setDescription('Flips a coin'),
    async execute(interaction: ChatInputCommandInteraction) {
        let result = Math.random() < 0.5 ? 'heads' : 'tails';
        await interaction.reply({content: `:coin: Flipping...` });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await interaction.editReply(`The coin landed on **${result}**!`);
    },
};

export = command;