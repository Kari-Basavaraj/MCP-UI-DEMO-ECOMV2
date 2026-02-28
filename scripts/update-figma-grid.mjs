#!/usr/bin/env node
/**
 * Update the Product Grid widget in Figma:
 * 1. Remove last 4 cards (keep first 4)
 * 2. Restyle remaining cards to match ref card component 3036:15731
 * 3. Update header text
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function resolveFoxyTool() {
  if (process.env.FOXY_TOOL_CALL) return process.env.FOXY_TOOL_CALL;
  if (process.env.FOXY_ROOT) return path.join(process.env.FOXY_ROOT, "scripts", "foxy-tool-call.mjs");
  return path.resolve(ROOT, "..", "foxy-design-system-master", "scripts", "foxy-tool-call.mjs");
}

const FOXY = resolveFoxyTool();
if (!fs.existsSync(FOXY)) {
  throw new Error(`Unable to find foxy tool. Set FOXY_TOOL_CALL or FOXY_ROOT. Resolved: ${FOXY}`);
}

function figmaExec(code) {
  if (!FOXY) throw new Error("FOXY tool path unresolved");
  const escaped = JSON.stringify({ code });
  const cmd = `JOIN_CHANNEL=default TOOL=execute_figma_code ARGS='${escaped}' node ${FOXY} 2>&1`;
  const raw = execSync(cmd, { encoding: "utf-8", timeout: 30000 });
  const line = raw.split("\n").find(l => l.startsWith("RESULT "));
  if (!line) throw new Error("No RESULT line:\n" + raw);
  const result = JSON.parse(line.slice(7));
  const inner = JSON.parse(result.content[0].text);
  return inner.data ? JSON.parse(inner.data) : inner;
}

// Step 1: Remove last 4 cards + update header
console.log("Step 1: Remove last 4 cards and update header...");
figmaExec(`
  const gridParent = await figma.getNodeByIdAsync("3036:15754");
  const header = gridParent.children.find(c => c.name === "header");
  const grid = gridParent.children.find(c => c.name === "grid");

  // Load font for header text update
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  // Update header count text
  const countText = header.children.find(c => c.name === "8 products");
  if (countText) {
    countText.characters = "4 products";
    countText.name = "4 products";
  }

  // Remove last 4 cards (keep first 4)
  const toRemove = grid.children.slice(4);
  for (const c of toRemove) c.remove();

  return JSON.stringify({ remaining: grid.children.length, header: countText?.characters });
`);
console.log("✓ Removed 4 cards, updated header\n");

// Step 2: Restyle each card to match reference card design
console.log("Step 2: Restyle cards to match reference card component...");
// Reference card spec: fill #FFFFFF, thumb 200px, thumb fill #F5F5F5, emoji 64px,
// cat pill radius 16, body gap 16, two buttons
figmaExec(`
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });

  const gridParent = await figma.getNodeByIdAsync("3036:15754");
  const grid = gridParent.children.find(c => c.name === "grid");

  for (const card of grid.children) {
    // Card background: #F5F5F5 → #FFFFFF
    card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

    // Find thumb / info
    const thumb = card.children.find(c => c.name === "thumb");
    const info = card.children.find(c => c.name === "info");

    if (thumb) {
      // Thumb height: 140 → 200
      thumb.resize(thumb.width, 200);
      // Thumb fill: #E6E6E6 → #F5F5F5
      thumb.fills = [{ type: "SOLID", color: { r: 245/255, g: 245/255, b: 245/255 } }];

      // Emoji: 40px → 64px
      const emoji = thumb.children.find(c => c.type === "TEXT" && c.characters.length <= 4);
      if (emoji) {
        emoji.fontSize = 64;
        emoji.resize(64, 64);
      }

      // Cat pill radius: 4 → 16
      const catPill = thumb.children.find(c => c.name === "cat");
      if (catPill) catPill.cornerRadius = 16;
    }

    if (info) {
      // Body gap: 8 → 16
      info.itemSpacing = 16;

      // Get the existing button
      const existingBtn = info.children.find(c => c.name === "Button" && c.type === "INSTANCE");

      if (existingBtn) {
        // Create an actions frame to hold both buttons
        const actions = figma.createFrame();
        actions.name = "actions";
        actions.layoutMode = "HORIZONTAL";
        actions.itemSpacing = 8;
        actions.primaryAxisSizingMode = "FIXED";
        actions.counterAxisSizingMode = "AUTO";
        actions.layoutAlign = "STRETCH";
        actions.fills = [];

        // Move existing button into actions frame
        info.appendChild(actions);

        // Clone button for reuse, then modify
        const addBtn = existingBtn.clone();
        existingBtn.remove();

        actions.appendChild(addBtn);
        addBtn.layoutGrow = 1;
        addBtn.paddingTop = 12;
        addBtn.paddingBottom = 12;

        // Create "Details" button frame (not an instance, matching ref style)
        const detailsBtn = figma.createFrame();
        detailsBtn.name = "Details Button";
        detailsBtn.layoutMode = "HORIZONTAL";
        detailsBtn.primaryAxisAlignItems = "CENTER";
        detailsBtn.counterAxisAlignItems = "CENTER";
        detailsBtn.primaryAxisSizingMode = "FIXED";
        detailsBtn.counterAxisSizingMode = "AUTO";
        detailsBtn.layoutGrow = 1;
        detailsBtn.cornerRadius = 8;
        detailsBtn.paddingTop = 12;
        detailsBtn.paddingBottom = 12;
        detailsBtn.paddingLeft = 8;
        detailsBtn.paddingRight = 8;
        // Light bg: #E3E3E3
        detailsBtn.fills = [{ type: "SOLID", color: { r: 227/255, g: 227/255, b: 227/255 } }];
        // Stroke: #D9D9D9
        detailsBtn.strokes = [{ type: "SOLID", color: { r: 217/255, g: 217/255, b: 217/255 } }];
        detailsBtn.strokeWeight = 1;

        const detailsText = figma.createText();
        detailsText.characters = "Details";
        detailsText.fontSize = 16;
        detailsText.fontName = { family: "Inter", style: "Regular" };
        detailsText.fills = [{ type: "SOLID", color: { r: 30/255, g: 30/255, b: 30/255 } }];
        detailsText.textAlignHorizontal = "CENTER";

        detailsBtn.appendChild(detailsText);
        actions.appendChild(detailsBtn);
      }
    }
  }

  return JSON.stringify({ done: true, cardCount: grid.children.length });
`);
console.log("✓ Restyled all 4 cards\n");

// Step 3: Resize grid to fit
console.log("Step 3: Resize grid parent...");
figmaExec(`
  const gridParent = await figma.getNodeByIdAsync("3036:15754");
  // Auto-height: cards are taller now, let auto-layout do its job
  gridParent.primaryAxisSizingMode = "AUTO";
  const grid = gridParent.children.find(c => c.name === "grid");
  grid.primaryAxisSizingMode = "AUTO";
  return JSON.stringify({ w: gridParent.width, h: Math.round(gridParent.height) });
`);
console.log("✓ Resized grid container\n");

console.log("Done! Product Grid updated in Figma.");
