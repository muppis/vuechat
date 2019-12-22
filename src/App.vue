<template>
    <div id="app"
    >
        <header>
            <h1>Skitapp</h1>
        </header>
        <section v-if="error">{{ error }}</section>
        <section v-if="!state.username">
            <form v-on:submit.prevent="onSubmitUsername">
                <input type="text"
                       v-model="username"
                       placeholder="Ange ditt namn"
                       required
                       minlength="3"
                       maxlength="12"
                />
                <button type="submit" title="Logga in">
                    <fa :icon="['fas', 'sign-in-alt']"/>
                </button>
            </form>
        </section>
        <section v-if="state.connected">
            <nav class="tabs">
                <ul>
                    <li v-for="channel in channels"
                        v-bind:key="channel.id"
                        :class="{current: channel.isCurrent}"
                        v-on:click="onTabClick(channel)"
                    >
                        <Tab v-bind:channel="channel"
                             v-bind:state="state"
                             v-on:leave="onTabLeave"
                        />
                    </li>
                    <li v-if="!currentChannel.isRenaming"
                        class="new-channel"
                    >
                        <button v-on:click="addChannel" title="Öppna ytterligare kanal">
                            <fa :icon="['fas', 'plus']"/>
                        </button>
                    </li>
                </ul>
            </nav>
        </section>
        <section v-if="state.connected && currentChannel"
                 class="messages"
        >
            <form v-if="currentChannel.isRenaming"
                  v-on:submit.prevent="onSubmitChannelName"
            >
                <img alt="Vue logo" src="./assets/logo.png">
                <h1>Vad heter kanalen?</h1>
                <input type="text"
                       v-model="currentChannel.name"
                       v-on:keyup.enter="submitNewName"
                       placeholder="Fyll i ett namn på kanalen"
                       required
                       minlength="4"
                       maxlength="12"
                />
                <button type="submit" title="Öppna kanal">
                    <fa :icon="['fas', 'door-closed']"/>
                </button>
            </form>
            <Message v-else
                     v-for="message in currentChannel.messages"
                     v-bind:key="message.id"
                     v-bind:message="message"
                     v-bind:state="state"
            />
        </section>
        <section v-if="state.connected && !currentChannel.isRenaming">
            <form class="new-message"
                  v-on:submit.prevent="onSubmitNewMessage"
            >
                <div class="name"></div>
                <input type="text"
                       class="body"
                       v-model="body"
                       required
                       maxlength="255"
                />
                <button type="submit"
                        class="submit"
                >
                    <fa :icon="['fas', 'envelope']"/>
                </button>
            </form>
        </section>
    </div>
</template>

<script>
    import PahoMQTT from 'paho-mqtt'
    import Tab from "@/components/Channel/Tab";
    import Message from "@/components/Channel/Message";

    import {FontAwesomeIcon as fa} from "@fortawesome/vue-fontawesome"

    export default {
        name: 'app',
        components: {
            fa,
            Tab,
            Message,
        },

        data() {
            return {
                state: {
                    connected: false,
                    username: null,
                },
                mqtt: null,
                subscriptions: {},
                username: null,
                channels: [],
                currentChannel: null,
                error: null,
                body: '',
            };
        },

        mounted() {
            if (localStorage.username) {
                this.state.username = localStorage.username;

                this.connect();
            }

            this.currentChannel = this.getNewChannel();
        },

        methods: {
            /* Channels */
            getNewChannel() {
                return {
                    id: this.channels.length,
                    name: 'Min kanal',
                    isCurrent: true,
                    isRenaming: true,
                    messages: [],
                    unreadMessages: 0,
                };
            },

            addChannel() {
                var newChannel = this.getNewChannel();
                this.setFocusOnChannel(newChannel);
            },

            onTabRename(channel) {
                this.setFocusOnChannel(channel);

                this.currentChannel.isRenaming = true;
            },

            onTabLeave(channel) {
                var ix = this.channels.indexOf(channel);

                if (this.channels.length > ix) {
                    this.currentChannel = this.channels[ix + 1];
                } else if (this.channels.length > 1) {
                    this.currentChannel = this.channels[ix - 1];
                }

                this.unsubscribe(channel);
                this.channels.splice(ix, 1);

                localStorage.channels = JSON.stringify(this.channels);
                if (!this.channels.length) {
                    this.currentChannel = this.getNewChannel();
                }
            },
            onSubmitChannelName() {
                this.currentChannel.isRenaming = false;

                this.subscribe(this.currentChannel);
                this.channels.push(this.currentChannel);

                localStorage.channels = JSON.stringify(this.channels);
            },

            setFocusOnChannel(channel) {
                this.currentChannel.isCurrent = false;
                channel.isCurrent = true;
                channel.unreadMessages = 0;
                this.currentChannel = channel;
            },

            /* Tabs */

            onTabClick(channel) {
                this.setFocusOnChannel(channel);
            },

            onTabDblClick() {
                this.$emit('rename', this.channel);
            },

            /* Message */
            onSubmitNewMessage() {
                var message = {
                    isFromSystem: false,
                    name: this.state.username,
                    body: this.body,
                };

                this.publish(this.currentChannel, message);

                this.body = '';
            },

            /* App */

            onSubmitUsername() {
                this.state.username = this.username;

                localStorage.username = this.state.username;

                this.connect();
            },

            connect() {
                this.mqtt = new PahoMQTT.Client(location.hostname, 9001, this.state.username + parseInt(Math.random() * 10000));

                this.mqtt.connect({
                    onSuccess: this.onConnectSuccess
                });

                this.mqtt.onMessageArrived = this.onMessageArrived;
                this.mqtt.onConnectionLost = this.onConnectionLost;
            },

            onConnectSuccess() {
                this.state.connected = true;

                if (localStorage.channels) {
                    try {
                        var channels = JSON.parse(localStorage.channels);

                        this.currentChannel = null;

                        for (var ix in channels) {
                            if (!channels.hasOwnProperty(ix)) {
                                continue;
                            }

                            var channel = channels[ix];
                            channel.id = ix;
                            this.subscribe(channel);
                            this.channels.push(channel);

                            if (channel.isCurrent) {
                                this.currentChannel = channel;
                            }

                            if (typeof channel.unreadMessages === 'undefined') {
                                channel.unreadMessages = 0;
                            }
                        }

                        if (!this.currentChannel) {
                            channel.isCurrent = true;
                            this.currentChannel = channel;
                        }

                    } catch (e) {
                        localStorage.channels = null;
                    }
                }
            },

            onConnectFailure(resp) {
                this.error = resp.errorMessage;
                this.state.connected = false;
            },

            onConnectionLost(resp) {
                this.error = resp.errorMessage;
                this.state.connected = false;
            },

            onMessageArrived(payload) {
                if (!this.subscriptions[payload.destinationName]) {
                    return;
                }

                var channels = this.subscriptions[payload.destinationName];

                for (var channel of channels) {
                    var message = JSON.parse(payload.payloadString);
                    message.id = channel.messages.length + 1;

                    channel.messages.push(message);

                    if (channel !== this.currentChannel) {
                        channel.unreadMessages++;
                    }
                }

                localStorage.channels = JSON.stringify(this.channels);
            },

            subscribe(channel) {
                if (!this.subscriptions[channel.name]) {
                    this.subscriptions[channel.name] = [];

                    this.mqtt.subscribe(channel.name);
                }

                this.subscriptions[channel.name].push(channel);

                var message = {
                    isFromSystem: true,
                    name: this.state.username,
                    body: this.state.username + ' anslöt till kanalen.',
                };

                this.publish(channel, message);
            },

            unsubscribe(channel) {
                if (!this.subscriptions[channel.name]) {
                    return;
                }

                var ix = this.subscriptions[channel.name].indexOf(channel);
                this.subscriptions[channel.name].splice(ix, 1);

                if (!this.subscriptions[channel.name].length) {
                    this.mqtt.unsubscribe(channel.name);
                }
            },

            publish(channel, message) {
                var payload = new PahoMQTT.Message(JSON.stringify(message));
                payload.destinationName = channel.name;

                this.mqtt.send(payload);
            }
        }
    }
</script>

<style>
    * {
        box-sizing: border-box;
    }

    html {
        padding: 0;
        margin: 0;
        height: 100vh;
    }

    body {
        padding: 0;
        margin: 0;
        height: 100%;
        min-height: 100%;
    }

    #app {
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-align: center;
        color: #2c3e50;
        display: flex;
        flex-flow: column;
        height: 100%;
        margin: 0 10px;
    }

    header {
        flex: 0 1 auto;
    }

    header h1 {
        margin: 10px 0 0 0;
        height: 40px;
    }

    section {
        flex: 0 1 auto;
    }

    /* Tabs */

    .tabs ul {
        list-style-type: none;
        display: flex;
        justify-content: space-evenly;
        flex-flow: row wrap;
        padding: 0;
        text-align: left;
    }

    .tabs li {
        border-collapse: collapse;
        border: thin solid #485460;
        padding: 4px 2px;
        flex: 1 0 auto;
        background: #d2dae2;
    }

    .tabs li.current {
        background: transparent;
    }

    .tabs li.new-channel {
        flex: 1 1 auto;
        max-width: 40px;
        text-align: center;
    }

    .tabs li.new-channel button {
        width: 100%;
    }

    .tabs li:first-child {
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
    }

    .tabs li:last-child {
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
    }

    .tabs button {
        background: transparent;
        border: none;
        height: 100%;
        cursor: pointer;
    }

    /* Meddelanden */
    .messages {
        overflow-y: auto;
        flex: 1 1 auto;
        padding-bottom: 2px;
    }

    /* Nytt meddelande */
    .new-message {
        display: flex;
        flex-flow: row nowrap;
        width: 100%;
        margin-bottom: 10px;
    }

    .new-message .name {
        flex: 0 1 auto;
        width: 100px;
    }

    .new-message input.body {
        line-height: 1em;
        font-family: 'Avenir', Helvetica, Arial, sans-serif;
        font-size: 16px;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        color: #2c3e50;
        flex: 1 1 auto
    }

    .new-message .submit {
        max-width: 40px;
        flex: 0 1 auto;
        background: transparent;
        cursor: pointer;
        text-align: center;

        border: thin solid #485460;
        border-left: none;
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
    }

</style>
