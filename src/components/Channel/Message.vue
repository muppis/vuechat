<template>
    <div
            class="system"
            v-if="message.isFromSystem"
    >
        {{ message.body }}
    </div>
    <div v-else
         class="message"
    >
        <span class="name">{{ message.name }}</span>
        <div class="body">{{ message.body }}</div>
        <div class="sent-at">{{ message.sent_at }}</div>
    </div>
</template>

<script>
    export default {
        name: "Message",
        props: [
            'message',
        ],
        mounted() {
            if (this.$el.scrollIntoViewIfNeeded) {
                this.$el.scrollIntoViewIfNeeded();
                return;
            }

            this.$el.scrollIntoView();
        }
    }
</script>

<style scoped>
    .system {
        font-style: italic;
        text-align: left;
    }

    .message {
        display: flex;
        flex-flow: row nowrap;
        text-align: left;
    }

    .name {
        flex: 0 1 auto;
        width: 100px;
    }

    .body {
        flex: 2 1 auto;
        overflow-wrap: break-word;
        overflow: hidden;
    }

    .date {
        flex: 0 1 auto;
    }
</style>