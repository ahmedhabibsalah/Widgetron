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

function showConfirmDialog(action, callbacks, onResult) {
  const message = formatConfirmationMessage(action);
  if (!message) return;

  const backdrop = document.createElement("div");
  backdrop.className = "widgetron-modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "widgetron-modal";
  modal.innerHTML = `
    <p class="widgetron-modal-message"></p>
    <div class="widgetron-modal-actions">
      <button class="widgetron-modal-cancel">Cancel</button>
      <button class="widgetron-modal-confirm">Confirm</button>
    </div>
  `;
  modal.querySelector(".widgetron-modal-message").textContent = message;

  const close = () => backdrop.remove();

  modal
    .querySelector(".widgetron-modal-confirm")
    .addEventListener("click", async () => {
      const confirmBtn = modal.querySelector(".widgetron-modal-confirm");
      confirmBtn.disabled = true;
      confirmBtn.textContent = "Working...";

      try {
        await executeAction(action, callbacks);
        close();
        onResult?.(action, true, null);
      } catch (err) {
        close();
        onResult?.(action, false, err.message);
      }
    });

  modal
    .querySelector(".widgetron-modal-cancel")
    .addEventListener("click", close);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

if (typeof module !== "undefined") {
  module.exports = { formatConfirmationMessage, showConfirmDialog };
}
