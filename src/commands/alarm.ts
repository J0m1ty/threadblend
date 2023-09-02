import { ActionRowBuilder, ChatInputCommandInteraction, ColorResolvable, ComponentType, EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, TextInputBuilder, TextInputComponent } from 'discord.js';
import { Alarm, Command, ExtendedClient, UserData } from 'src/structures';
import { color } from '../config.json';
import { scheduleJob } from 'node-schedule';

const command: Command = {
    plugin: null,
    data: new SlashCommandBuilder()
        .setName('alarms')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an alarm')
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setDescription('The duration of the alarm')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(60))
                .addStringOption(option => 
                    option
                        .setName('units')
                        .setDescription('The units for the duration')
                        .addChoices(
                            { name: 'seconds', value: 'seconds' },
                            { name: 'minutes', value: 'minutes' },
                            { name: 'hours', value: 'hours' },
                            { name: 'days', value: 'days' },
                        ))
                .addStringOption(option =>
                    option
                        .setName('message')
                        .setDescription('The message to send when the alarm goes off')
                        .setMinLength(1)
                        .setMaxLength(200)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your alarms')) 
        .addSubcommand(subcommand =>
            subcommand
                .setName('cancel')
                .setDescription('Cancel an alarm'))
        .setDescription('Manage your alarms'),
    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild() || !interaction.channel) return;

        const user: UserData | null = await (interaction.client as ExtendedClient).db.get(`users.${interaction.user.id}`);

        if (!user) return;

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'add':
                const duration = interaction.options.getInteger('duration', true);
                const units = interaction.options.getString('units') ?? 'minutes';
                const message = interaction.options.getString('message') ?? 'No message provided';
                
                const conversions: Record<string, number> = {
                    milliseconds: 1,
                    seconds: 1000,
                    minutes: 60000,
                    hours: 3600000,
                    days: 86400000,
                }
                
                const date = new Date(Date.now() + duration * conversions[units]);

                const alarm: Alarm = {
                    message: message,
                    started: Date.now(),
                    date: date.getTime()
                }

                scheduleJob(date, async function(id: string, date: Date, channel: string) {
                    const deferred_user: UserData | null = await (interaction.client as ExtendedClient).db.get(`users.${id}`);

                    if (!deferred_user) return;

                    const index = deferred_user.alarms.findIndex(a => a.date === date.getTime());

                    if (index === -1) return;

                    deferred_user.alarms.splice(index, 1);

                    await (interaction.client as ExtendedClient).db.set(`users.${id}`, deferred_user);

                    const member = await interaction.guild?.members.fetch(id);

                    

                    const embed = new EmbedBuilder()
                        .setTitle(`:alarm_clock:  Alarm from  <#${channel}>`)
                        .setDescription(`**Message:**\n> ${message}`)
                        .setTimestamp()
                        .setColor(color as ColorResolvable);

                    await member?.send({ embeds: [embed] })
                        .catch(async (ignored) => {});
                }.bind(null, interaction.user.id, date, interaction.channel.id));
                
                user.alarms.push(alarm);

                await (interaction.client as ExtendedClient).db.set(`users.${interaction.user.id}`, user);

                await interaction.reply({ content: `:hourglass:  Alarm set for \`${duration} ${units.substring(0, units.length - 1)}${duration > 1 ? 's' : ''}\` from now.`, ephemeral: true });
                break;
            case 'view': case 'cancel': 
                if (user.alarms.length === 0) {
                    await interaction.reply({ content: ':information_source:  You have no alarms set.', ephemeral: true });
                    return;
                }

                let fields: { name: string, value: string }[] = [];
                
                user.alarms.forEach((a, i) => {
                    let duration = Math.max(a.date - Date.now(), 0);

                    let days = Math.floor(duration / 86400000);
                    duration -= days * 86400000;
                    let hours = Math.floor(duration / 3600000);
                    duration -= hours * 3600000;
                    let minutes = Math.floor(duration / 60000);
                    duration -= minutes * 60000;
                    let seconds = Math.floor(duration / 1000);

                    let time = `${days > 0 ? `${days} day${days > 1 ? 's' : ''}, ` : ''}${hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''}, ` : ''}${minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}, ` : ''}${seconds > 0 ? `${seconds} second${seconds > 1 ? 's' : ''}` : ''}`;
                    
                    fields.push({
                        name: `:alarm_clock: Alarm #${i + 1}`,
                        value: `Message: ${a.message.substring(0, 55).trim()}${a.message.length > 55 ? '...' : ''}\nTime Remaining: ${time}`,
                    });
                });

                const member = await interaction.guild?.members.fetch(interaction.user.id);
                
                const embed = new EmbedBuilder()
                    .setDescription(`\`\`\`${member?.nickname ?? interaction.user.username}'s Alarms\`\`\``)
                    .setFields(...fields)
                    .setTimestamp()
                    .setColor(color as ColorResolvable);

                if (subcommand == 'view') {
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                    return;
                }
                
                embed.setDescription(`:no_entry_sign:  Select the number of the alarm you want to cancel.\n\u200b`);
                embed.setTimestamp(null);

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('alarm')
                        .setPlaceholder('Select an alarm')
                        .addOptions(
                            ...user.alarms.map((a, i) => ({ label: `Alarm #${i + 1}`, value: `${i}`, description: `Message: ${a.message.substring(0, 22)}${a.message.length > 22 ? '...' : ''}`}))
                        ));

                const reply = await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

                const filter = (i: StringSelectMenuInteraction) => {
                    i.deferUpdate();
                    return i.user.id === interaction.user.id;
                }

                await reply.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 30000 })
                    .then(async i => {
                        let deferred_user: UserData | null = await (interaction.client as ExtendedClient).db.get(`users.${i.user.id}`);

                        if (!deferred_user) {
                            await interaction.deleteReply();
                            return;
                        }

                        const index = parseInt(i.values[0]);

                        if (isNaN(index)) {
                            await interaction.deleteReply();
                            return;
                        }

                        deferred_user.alarms.splice(index, 1);

                        await (interaction.client as ExtendedClient).db.set(`users.${i.user.id}`, deferred_user);

                        await interaction.editReply({ content: `:no_entry_sign:  \`Alarm #${index + 1}\` deleted.`, embeds: [], components: [] });
                    }).catch(async () => {
                        await interaction.deleteReply();
                    });
                break;
        }
    },
};

export = command;