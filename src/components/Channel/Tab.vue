<template
>
    <span :style="style">
        {{channel.name}}
        <button v-if="!channel.isRenaming"
                title="Lämna kanal"
                v-on:click.stop="onLeaveChannel"
        >
            <fa :icon="['fas', 'door-open']"/>
        </button>
        <fa v-if="channel.unreadMessages" :icon="['fas', 'bell']" style="color: #e67e22" pulse />
    </span>
</template>

<script>
    import {FontAwesomeIcon as fa} from "@fortawesome/vue-fontawesome"

    export default {
        name: "Tab",
        components: {
            fa,
        },

        props: [
            'channel',
            'state',
        ],
        computed: {
            style() {
                var style = {};

                if (this.channel.isRenaming) {
                    style['font-style'] = 'italic';
                }

                return style;
            }
        },

        methods: {
            onLeaveChannel() {
                this.$emit('leave', this.channel);
            }
        }
    }
</script>

<style scoped>
    li {
        flex: 1;
        text-align: left;
        padding-left: 4px;
        background: #d2dae2;
    }

    li.current {
        background: transparent;
    }

    button {
        background: transparent;
        border: none;
        height: 100%;
        cursor: pointer;
    }

</style>