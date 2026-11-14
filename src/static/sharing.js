function createActivitySharing(name) {
  const activityUrl = new URL(window.location.pathname, window.location.origin);
  activityUrl.hash = `activity-${encodeURIComponent(name)}`;
  const url = activityUrl.href;
  const text = `Check out ${name} at Mergington High School!`;

  const sharing = document.createElement("div");
  sharing.className = "activity-sharing";
  sharing.setAttribute("role", "group");
  sharing.setAttribute("aria-label", `Share ${name}`);

  const label = document.createElement("span");
  label.textContent = "Share:";
  sharing.appendChild(label);

  const destinations = [
    ["WhatsApp", "https://wa.me/", { text: `${text} ${url}` }],
    ["Facebook", "https://www.facebook.com/sharer/sharer.php", { u: url }],
    ["X", "https://twitter.com/intent/tweet", { text, url }],
  ];

  destinations.forEach(([platform, address, parameters]) => {
    const link = document.createElement("a");
    const destination = new URL(address);
    destination.search = new URLSearchParams(parameters).toString();
    link.href = destination.href;
    link.textContent = platform;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `Share ${name} on ${platform} (opens in a new tab)`);
    sharing.appendChild(link);
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.textContent = "Copy link";
  copyButton.setAttribute("aria-label", `Copy link to ${name}`);
  sharing.appendChild(copyButton);

  const status = document.createElement("span");
  status.className = "share-status";
  status.setAttribute("role", "status");
  sharing.appendChild(status);

  let manualLink;
  function showManualCopy() {
    status.textContent = "Automatic copying is unavailable. Copy the link below:";
    if (!manualLink) {
      manualLink = document.createElement("input");
      manualLink.type = "text";
      manualLink.readOnly = true;
      manualLink.value = url;
      manualLink.className = "share-link";
      manualLink.setAttribute("aria-label", `Link to ${name}`);
      sharing.appendChild(manualLink);
    }
    manualLink.focus();
    manualLink.select();
  }

  copyButton.addEventListener("click", async () => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      showManualCopy();
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      status.textContent = "Link copied!";
      if (manualLink) {
        manualLink.remove();
        manualLink = null;
      }
    } catch (error) {
      console.error("Could not copy activity link:", error);
      showManualCopy();
    }
  });

  return sharing;
}
