<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CreditCard, ShieldCheck } from 'lucide-vue-next'
import type { DatabaseBooking } from '../../../services/api'

const props = defineProps<{
  booking: DatabaseBooking | null
  saving: boolean
  error: string
}>()
const emit = defineEmits<{ close: []; confirm: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const amount = computed(() => new Intl.NumberFormat('en-LK', {
  style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
}).format(props.booking?.totalPrice ?? 0))

watch([() => props.booking?.id, dialog], ([id]) => {
  if (id && dialog.value && !dialog.value.open) dialog.value.showModal()
  if (!id && dialog.value?.open) dialog.value.close()
}, { flush: 'post' })

function close(): void {
  if (!props.saving) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="demo-payment-dialog"
    aria-labelledby="demo-payment-title"
    aria-describedby="demo-payment-notice"
    :aria-busy="saving"
    @cancel.prevent="close"
  >
    <form @submit.prevent="emit('confirm')">
      <div class="checkout-heading">
        <CreditCard :size="28" aria-hidden="true" />
        <span class="demo-badge">DEMONSTRATION ONLY</span>
      </div>
      <h2 id="demo-payment-title">Demo checkout</h2>
      <p id="demo-payment-notice" class="checkout-notice">
        Simulate a booking payment for this project. No money will be charged.
        No bank or card details are needed.
      </p>

      <dl v-if="booking" class="checkout-summary">
        <div><dt>Reservation</dt><dd>{{ booking.itemName }}</dd></div>
        <div><dt>Dates</dt><dd>{{ booking.checkIn }} to {{ booking.checkOut }}</dd></div>
        <div><dt>Guests</dt><dd>{{ booking.guests }}</dd></div>
        <div><dt>Booking reference</dt><dd class="booking-reference">{{ booking.id }}</dd></div>
        <div class="checkout-total"><dt>Demo amount</dt><dd>{{ amount }}</dd></div>
      </dl>

      <p class="checkout-method"><ShieldCheck :size="18" aria-hidden="true" /> Test payment simulation</p>
      <p v-if="error" class="checkout-error" role="alert">{{ error }}</p>

      <div class="checkout-actions">
        <button type="button" class="button button-outline" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="button button-dark" :disabled="saving || !booking">
          {{ saving ? 'Recording demo payment...' : 'Simulate payment' }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.demo-payment-dialog { box-sizing: border-box; width: min(540px, calc(100% - 28px)); max-height: calc(100dvh - 28px); overflow: auto; border: 1px solid #d9dfd2; border-radius: 14px; padding: 28px; color: #1f302c; background: #faf9f6; }
.demo-payment-dialog::backdrop { background: rgb(18 31 26 / 60%); }
.checkout-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.demo-badge { padding: 7px 10px; border-radius: 20px; background: #e6edcf; font-size: 10px; font-weight: 700; letter-spacing: .05em; }
h2 { margin: 18px 0 12px; font-size: 28px; }
.checkout-notice { line-height: 1.6; font-size: 14px; }
.checkout-summary { margin: 20px 0; }
.checkout-summary > div { display: grid; grid-template-columns: 125px minmax(0, 1fr); gap: 14px; padding: 11px 0; border-bottom: 1px solid #e2e5dc; }
dt { font-size: 13px; color: #667063; }
dd { margin: 0; font-size: 14px; text-align: right; overflow-wrap: anywhere; }
.booking-reference { font-family: monospace; font-size: 12px; }
.checkout-total dd { font-size: 20px; font-weight: 700; }
.checkout-method { display: flex; gap: 8px; align-items: center; font-size: 13px; }
.checkout-error { padding: 12px; background: #fff0ec; color: #922b21; font-size: 14px; line-height: 1.5; }
.checkout-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.checkout-actions .button { min-height: 44px; }
button:disabled { cursor: wait; opacity: .6; }
@media (max-width: 480px) {
  .demo-payment-dialog { padding: 20px; }
  .checkout-summary > div { grid-template-columns: 95px minmax(0, 1fr); gap: 10px; }
  .checkout-actions { flex-direction: column-reverse; }
}
</style>
