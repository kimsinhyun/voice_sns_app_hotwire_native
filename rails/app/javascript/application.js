// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

import { Turbo } from "@hotwired/turbo-rails"

Turbo.StreamActions.dispatch_custom_event = function () {
  const eventName = this.getAttribute("event-name");
  if (!eventName) {
    console.error('[Turbo Stream] Missing "event-name" attribute for dispatch_custom_event action');
    return;
  }

  const detail = this.getAttribute("event-detail") ? JSON.parse(this.getAttribute("event-detail")) : {};

  const event = new CustomEvent(eventName, { bubbles: true, detail });
  window.dispatchEvent(event);

  console.log(`✅ [Turbo Stream] Dispatched "${eventName}" event with detail:`, detail);
};