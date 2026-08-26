function formatConfirmationMessage(action) {
  if (action.action === "add_to_cart") {
    const qty = action.quantity ?? 1;
    return `Add ${qty} × ${action.item} to your cart?`;
  }

  if (action.action === "remove_from_cart") {
    return action.quantity
      ? `Remove ${action.quantity} × ${action.item} from your cart?`
      : `Remove ${action.item} from your cart?`;
  }

  return null;
}

function showConfirmDialog(action, callbacks) {
  const message = formatConfirmationMessage(action);
  if (!message) return;

  const dialog = document.createElement("div");
  dialog.className = "widgetron-confirm";
  dialog.innerHTML = `
    <p class="widgetron-confirm-message"></p>
    <button class="widgetron-confirm-yes">Confirm</button>
    <button class="widgetron-confirm-no">Cancel</button>
  `;
  dialog.querySelector(".widgetron-confirm-message").textContent = message;

  dialog
    .querySelector(".widgetron-confirm-yes")
    .addEventListener("click", () => {
      executeAction(action, callbacks);
      dialog.remove();
    });

  dialog
    .querySelector(".widgetron-confirm-no")
    .addEventListener("click", () => {
      dialog.remove();
    });

  document.body.appendChild(dialog);
}

if (typeof module !== "undefined") {
  module.exports = { formatConfirmationMessage, showConfirmDialog };
}
