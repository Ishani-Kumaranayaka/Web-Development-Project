<script setup lang="ts">
import { ref, watch } from "vue";
import { ArrowRight, Compass, X, Eye, EyeOff } from "lucide-vue-next";
import { useAppPageContext } from "../../context/appPageContext";

const { modal, loginName, loginEmail, loginPassword,signIn } =
  useAppPageContext();

// Show / hide password
const showPassword = ref(false);

// Close the dialog only when the mouse is pressed AND released on the dark background.
// This stops it closing when you click inside a field and release outside.
let pressedOnBackdrop = false;

function onBackdropMouseDown(event: MouseEvent) {
  pressedOnBackdrop = event.target === event.currentTarget;
}

function onBackdropClick(event: MouseEvent) {
  if (pressedOnBackdrop && event.target === event.currentTarget) {
    closeModal();
  }
  pressedOnBackdrop = false;
}

function closeModal() {
  modal.value = "";
}

// Clear the form every time the dialog closes
// (X button, clicking outside, or after signing in / creating an account)
function resetForm() {
  loginName.value = "";
  loginEmail.value = "";
  loginPassword.value = "";
  showPassword.value = false;
}

watch(modal, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) {
    resetForm();
  }
});
</script>

<template>
  <div
    v-if="modal"
    class="modal-backdrop"
    @mousedown="onBackdropMouseDown"
    @click="onBackdropClick"
  >
    <section
      class="auth-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="modal === 'login' ? 'Sign in' : 'Create an account'"
    >
      <button
        type="button"
        class="modal-close quiet-button"
        aria-label="Close"
        @click="closeModal"
      >
        <X :size="19" />
      </button>

      <span class="brand-mark modal-mark"><Compass :size="23" /></span>

      <p class="eyebrow">
        {{ modal === "login" ? "WELCOME BACK" : "YOUR ISLAND IS WAITING" }}
      </p>
      <h2>
        {{ modal === "login" ? "Find your way back." : "Let’s go somewhere." }}
      </h2>
      <p>
        {{
          modal === "login"
            ? "Sign in to pick up where you left off."
            : "Create an account and make this island yours."
        }}
      </p>

      <form @submit.prevent="signIn">
        <label v-if="modal === 'register'" class="field-label">
          YOUR NAME
          <input v-model="loginName" required placeholder="Alex Morgan" />
        </label>

        <label class="field-label">
          EMAIL ADDRESS
          <input
            v-model="loginEmail"
            required
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
          />
        </label>

        <label class="field-label">
          PASSWORD
          <div class="password-field">
            <input
              v-model="loginPassword"
              :type="showPassword ? 'text' : 'password'"
              required
:minlength="modal === 'register' ? 8 : 1"
              placeholder="At least 8 characters"
              :autocomplete="modal === 'login' ? 'current-password' : 'new-password'"
            />
            <button
              type="button"
              class="toggle-password"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </div>
        </label>

  

        <button class="button button-dark wide-button" type="submit">
          {{ modal === "login" ? "Sign in" : "Create account" }}
          <ArrowRight :size="16" />
        </button>
      </form>

      <button
        type="button"
        class="modal-switch"
        @click="modal = modal === 'login' ? 'register' : 'login'"
      >
        {{
          modal === "login"
            ? "New here? Create an account"
            : "Already with us? Sign in"
        }}
      </button>

    </section>
  </div>
</template>