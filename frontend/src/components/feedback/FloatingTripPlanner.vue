<script setup lang="ts">
import { CalendarDays } from "lucide-vue-next";
import { useAppPageContext } from "../../context/appPageContext";

const { go } = useAppPageContext();
</script>

<template>
  <a
    class="floating-planner"
    href="/planner"
    aria-label="Open trip planner"
    @click.prevent="go('/planner')"
    ><CalendarDays :size="18" /><span>Plan a trip</span></a
  >
</template>
