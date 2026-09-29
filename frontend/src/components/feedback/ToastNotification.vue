<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { useAppPageContext } from "../../context/appPageContext";

const { toast } = useAppPageContext();
</script>

<template>
  <Transition name="toast"
    ><div v-if="toast" class="toast-message">
      <Check :size="17" /> {{ toast }}
    </div></Transition
  >
</template>
