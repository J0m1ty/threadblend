import { ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, Message, ModalSubmitFields, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { ChannelRules, Command, ExtendedClient, GuildData, Rule } from 'src/structures';
import { color } from '../config.json';
import { builtins } from '../util';

const command: Command = {
    plugin: 'rules',
    data: new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Manage channel formatting rules')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a rule to the channel')
                .addStringOption(option =>
                    option
                        .setName('available-rule')
                        .setDescription('The rule to add')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('List the rules on the channel'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a rule from the channel')
                .addStringOption(option =>
                    option
                        .setName('existing-rule')
                        .setDescription('The rule to remove')
                        .setRequired(true)
                        .setAutocomplete(true)))
        // .addSubcommand(subcommand =>
        //     subcommand
        //         .setName('custom')
        //         .setDescription('Add a custom rule to the channel with regex')
        //         .addStringOption(option =>
        //             option
        //                 .setName('name')
        //                 .setDescription('The name of the rule')
        //                 .setRequired(true))
        //         .addStringOption(option =>
        //             option
        //                 .setName('regex')
        //                 .setDescription('The regex of the rule')
        //                 .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all rules from the channel'))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),
    async autocomplete(focusedOption, interaction) {
        let options: string[] = [];

        switch (focusedOption.name) {
            case 'existing-rule': case 'available-rule':
                if (!interaction.inGuild()) break;

                let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

                if (!guild) break;

                let channel = guild.channels[interaction.channelId];

                if (!channel) break;
                
                let plugin = channel.plugins.find(p => p.name === 'rules');

                if (!plugin || plugin.name !== 'rules') break;

                if (focusedOption.name === 'existing-rule') {
                    options = plugin.rules.map(r => r.name);
                }
                else {
                    options.push(...builtins.map(b => b.name).filter(b => !(plugin as ChannelRules).rules.some(r => r.name == b)))
                }

                break;
        }

        return options;
    },
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild() || !interaction.channel) return;

        let guild: GuildData | null = await (interaction.client as ExtendedClient).db.get(interaction.guildId);

        if (!guild) return;

        let channel = guild.channels[interaction.channelId];

        if (!channel) return;

        let plugin = channel.plugins.find(p => p.name === 'rules');

        if (!plugin || plugin.name !== 'rules') return;

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                const rule = interaction.options.getString('available-rule', true);

                if (plugin.rules.some(r => r.name === rule)) {
                    await interaction.reply({ content: `:x: That format rule already exists on this channel.`, ephemeral: true });
                    return;
                }
                
                let builtin = builtins.find(b => b.name === rule);

                if (!builtin) {
                    await interaction.reply({ content: `:x: That format rule does not exist.`, ephemeral: true });
                    return;
                }

                plugin.rules.push({
                    name: rule,
                    builtin: true
                });

                await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);
                
                await interaction.reply({ content: `:white_check_mark: Added the \`${rule}\` format rule to this channel.`, ephemeral: true });
                break;
            case 'view':
                if (plugin.rules.length === 0) {
                    await interaction.reply({ content: `:information_source: There are no format rules on this channel.`, ephemeral: true });
                    return;
                }

                let fields = [
                    {
                        name: ':scroll:  Builtin Rules:',
                        value: plugin.rules.filter(r => r.builtin).map(r => `- ${r.name}`).join('\n')
                    },
                    {
                        name: ':gear:  Custom Rules:',
                        value: plugin.rules.filter(r => !r.builtin).map(r => `- ${r.name}`).join('\n')
                    }
                ]

                const embed = new EmbedBuilder()
                    .setDescription(`\`\`\`Formatting Rules\`\`\``)
                    .setFields(...fields.filter(f => f.value.length > 0))
                    .setColor(color as ColorResolvable);

                await interaction.reply({ embeds: [embed], ephemeral: true });
                break;
            case 'remove':
                const ruleToRemove = interaction.options.getString('existing-rule', true);

                if (!plugin.rules.some(r => r.name === ruleToRemove)) {
                    await interaction.reply({ content: `:x: That format rule does not exist on this channel.`, ephemeral: true });
                    return;
                }

                plugin.rules = plugin.rules.filter(r => r.name !== ruleToRemove);

                await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);

                await interaction.reply({ content: `:white_check_mark: Removed the \`${ruleToRemove}\` format rule from this channel.`, ephemeral: true });
                break;
            // case 'custom':
            //     const name = interaction.options.getString('name', true);
            //     const regex = interaction.options.getString('regex', true);

            //     if (plugin.rules.some(r => r.name === name)) {
            //         await interaction.reply({ content: `:x: A format rule with that name already exists on this channel.`, ephemeral: true });
            //         return;
            //     }
                
            //     try {
            //         plugin.rules.push({
            //             name,
            //             regex: new RegExp(regex).toString(),
            //             builtin: false
            //         });

            //         await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);

            //         await interaction.reply({ content: `:white_check_mark: Added the \`${name}\` format rule to this channel.`, ephemeral: true });
            //     }
            //     catch (error) {
            //         await interaction.reply({ content: `:x: That regex is invalid.`, ephemeral: true });
            //     }

            //     break;
            case 'clear':
                plugin.rules = [];

                await (interaction.client as ExtendedClient).db.set(interaction.guildId, guild);

                await interaction.reply({ content: `:white_check_mark: Cleared all format rules from this channel.`, ephemeral: true });
                break;
        }
    },
};

export = command;