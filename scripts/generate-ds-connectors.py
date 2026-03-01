#!/usr/bin/env python3
"""
Generate Code Connect .figma.tsx files for all individual DS components
in the MCPUI-DS-V2 Figma file.

These are the building-block components (Button, Input, Card, Tag, etc.)
that are used INSIDE the 12 widget compositions.

Run: python3 scripts/generate-ds-connectors.py
Then: cd figma && npx @figma/code-connect publish --token $FIGMA_ACCESS_TOKEN
"""

import os
import json

FIGMA_FILE_KEY = "dbPjFeLfAFp8Sz9YGPs0CZ"
FIGMA_FILE_NAME = "MCPUI-DS-V2"
BASE_URL = f"https://www.figma.com/design/{FIGMA_FILE_KEY}/{FIGMA_FILE_NAME}"

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "figma", "code-connect", "components", "ds")

# ── DS Component Definitions ──────────────────────────────────────────
# Each entry: (filename, figma_node_id, component_name, example_jsx)
# Node IDs from Figma file inventory (component sets)

DS_COMPONENTS = [
    # ── Core UI ──
    ("Button", "4185:3778", "Button", '''
    <button
      className="btn btn-primary"
      data-action="add-to-cart"
    >
      Add to Cart
    </button>
    '''),

    ("ButtonDanger", "185:852", "Button Danger", '''
    <button className="btn btn-danger" data-action="remove">
      Remove
    </button>
    '''),

    ("IconButton", "11:11508", "Icon Button", '''
    <button className="btn btn-ghost btn-icon" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
    '''),

    ("ButtonGroup", "2072:9432", "Button Group", '''
    <div className="btn-group">
      <button className="btn btn-primary">Add to Cart</button>
      <button className="btn btn-secondary">Details</button>
    </div>
    '''),

    ("Card", "2142:11380", "Card", '''
    <div className="card">
      <img className="card-image" src={product.imageUrl} alt={product.name} />
      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        <p className="card-price">₹{product.price}</p>
      </div>
    </div>
    '''),

    ("PricingCard", "1444:11846", "Pricing Card", '''
    <div className="card pricing-card">
      <div className="pricing-header">
        <h3>{plan.name}</h3>
        <span className="price">₹{plan.price}/mo</span>
      </div>
      <ul className="pricing-features">
        {plan.features.map(f => <li key={f}>{f}</li>)}
      </ul>
      <button className="btn btn-primary">Choose Plan</button>
    </div>
    '''),

    ("Tag", "56:8830", "Tag", '''
    <span className="tag tag-default">{category}</span>
    '''),

    ("TagToggle", "157:10316", "Tag Toggle", '''
    <button
      className={`tag tag-toggle ${isActive ? "tag-active" : ""}`}
      onClick={() => onToggle(category)}
    >
      {category}
    </button>
    '''),

    ("Tooltip", "315:32700", "Tooltip", '''
    <div className="tooltip-wrapper">
      <button className="btn btn-ghost" aria-describedby="tooltip-1">
        Info
      </button>
      <div className="tooltip" id="tooltip-1" role="tooltip">
        {tooltipText}
      </div>
    </div>
    '''),

    ("SearchComponent", "2236:14989", "Search", '''
    <div className="search-wrapper">
      <input
        type="text"
        className="search-input"
        placeholder="Search products..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className="btn btn-primary search-btn" data-action="search">
        Search
      </button>
    </div>
    '''),

    ("NavigationButton", "515:5459", "Navigation Button", '''
    <button className="nav-btn nav-btn-default">
      <span className="nav-btn-icon">{icon}</span>
      <span className="nav-btn-label">{label}</span>
    </button>
    '''),

    ("NavigationButtonList", "524:503", "Navigation Button List", '''
    <nav className="nav-btn-list">
      {items.map(item => (
        <button key={item.id} className="nav-btn nav-btn-default">
          {item.label}
        </button>
      ))}
    </nav>
    '''),

    ("NavigationPill", "7768:19970", "Navigation Pill", '''
    <button className={`nav-pill ${isActive ? "nav-pill-active" : ""}`}>
      {label}
    </button>
    '''),

    ("NavigationPillList", "2194:14984", "Navigation Pill List", '''
    <div className="nav-pill-list">
      {categories.map(cat => (
        <button
          key={cat}
          className={`nav-pill ${activeCategory === cat ? "nav-pill-active" : ""}`}
          onClick={() => onFilter(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
    '''),

    ("Tab", "3729:12963", "Tab", '''
    <div className="tab-list" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          className={`tab ${activeTab === tab.id ? "tab-active" : ""}`}
          aria-selected={activeTab === tab.id}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
    '''),

    ("Notification", "124:8256", "Notification", '''
    <div className={`notification notification-${type}`} role="alert">
      <span className="notification-icon">{icon}</span>
      <span className="notification-message">{message}</span>
      <button className="notification-close" aria-label="Dismiss">×</button>
    </div>
    '''),

    # ── Form Components ──
    ("InputField", "2136:2263", "Input Field", '''
    <div className="field">
      <label className="field-label" htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        className="field-input"
        placeholder="Enter email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {error && <span className="field-error">{error}</span>}
    </div>
    '''),

    ("SelectField", "2136:2336", "Select Field", '''
    <div className="field">
      <label className="field-label" htmlFor="size">Size</label>
      <select
        id="size"
        className="field-select"
        value={selectedSize}
        onChange={(e) => setSelectedSize(e.target.value)}
      >
        <option value="">Select size</option>
        {sizes.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
    '''),

    ("CheckboxField", "9762:1441", "Checkbox Field", '''
    <label className="field-checkbox">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      <span className="checkbox-indicator" />
      <span className="checkbox-label">{label}</span>
    </label>
    '''),

    ("RadioField", "9762:1412", "Radio Field", '''
    <fieldset className="field-radio-group">
      <legend className="field-label">{groupLabel}</legend>
      {options.map(opt => (
        <label key={opt.value} className="field-radio">
          <input
            type="radio"
            name={groupName}
            value={opt.value}
            checked={selected === opt.value}
            onChange={() => setSelected(opt.value)}
          />
          <span className="radio-indicator" />
          <span className="radio-label">{opt.label}</span>
        </label>
      ))}
    </fieldset>
    '''),

    ("SwitchField", "9762:1902", "Switch Field", '''
    <label className="field-switch">
      <input
        type="checkbox"
        role="switch"
        checked={isOn}
        onChange={(e) => setIsOn(e.target.checked)}
      />
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
      <span className="switch-label">{label}</span>
    </label>
    '''),

    ("TextareaField", "9762:3088", "Textarea Field", '''
    <div className="field">
      <label className="field-label" htmlFor="notes">Notes</label>
      <textarea
        id="notes"
        className="field-textarea"
        rows={4}
        placeholder="Enter notes..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
    '''),

    ("SliderField", "589:17676", "Slider Field", '''
    <div className="field">
      <label className="field-label" htmlFor="qty">Quantity: {value}</label>
      <input
        id="qty"
        type="range"
        className="field-slider"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
    '''),

    ("DateInputField", "4302:7505", "Date Input Field", '''
    <div className="field">
      <label className="field-label" htmlFor="date">Date</label>
      <input
        id="date"
        type="date"
        className="field-input field-date"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
    '''),

    ("DatePickerField", "4300:6892", "Date Picker Field", '''
    <div className="field">
      <label className="field-label">Select Date</label>
      <div className="date-picker">
        <div className="date-picker-header">
          <button className="btn btn-ghost" onClick={prevMonth}>←</button>
          <span>{monthLabel}</span>
          <button className="btn btn-ghost" onClick={nextMonth}>→</button>
        </div>
        <div className="date-picker-grid">
          {days.map(d => (
            <button
              key={d}
              className={`date-cell ${selected === d ? "date-selected" : ""}`}
              onClick={() => setSelected(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
    '''),

    # ── Layout / Content ──
    ("AccordionItem", "7753:4634", "Accordion Item", '''
    <details className="accordion-item" open={isOpen}>
      <summary className="accordion-header" onClick={() => toggle()}>
        <span>{title}</span>
        <span className="accordion-chevron" />
      </summary>
      <div className="accordion-content">{children}</div>
    </details>
    '''),

    ("Avatar", "9762:1103", "Avatar", '''
    <div className="avatar avatar-md">
      <img src={user.avatarUrl} alt={user.name} />
    </div>
    '''),

    ("AvatarGroup", "56:15608", "Avatar Group", '''
    <div className="avatar-group">
      {users.slice(0, 3).map(u => (
        <div key={u.id} className="avatar avatar-sm">
          <img src={u.avatarUrl} alt={u.name} />
        </div>
      ))}
      {users.length > 3 && (
        <div className="avatar avatar-sm avatar-overflow">
          +{users.length - 3}
        </div>
      )}
    </div>
    '''),

    ("DialogBody", "9762:696", "Dialog Body", '''
    <div className="dialog-overlay" role="dialog" aria-modal="true">
      <div className="dialog">
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
    '''),

    ("Header", "2287:22651", "Header", '''
    <header className="site-header">
      <div className="header-logo">{logoText}</div>
      <nav className="header-nav">
        {navItems.map(item => (
          <a key={item.href} href={item.href} className="header-link">
            {item.label}
          </a>
        ))}
      </nav>
      <div className="header-actions">
        <button className="btn btn-ghost btn-icon" aria-label="Cart">🛒</button>
      </div>
    </header>
    '''),

    ("Footer", "321:11357", "Footer", '''
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-brand">{brandName}</div>
        <nav className="footer-links">
          {links.map(link => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
      </div>
      <div className="footer-copyright">© {year} {brandName}</div>
    </footer>
    '''),

    ("HeaderAuth", "18:9389", "Header Auth", '''
    <div className="header-auth">
      <button className="btn btn-ghost">Sign In</button>
      <button className="btn btn-primary">Sign Up</button>
    </div>
    '''),

    ("TextContentHeading", "2153:7834", "Text Content Heading", '''
    <div className="text-content">
      <h2 className="heading">{heading}</h2>
      <p className="subheading">{description}</p>
    </div>
    '''),

    ("TextContentTitle", "2153:7838", "Text Content Title", '''
    <div className="text-content">
      <span className="overline">{overline}</span>
      <h1 className="title">{title}</h1>
    </div>
    '''),

    ("TextLinkList", "322:9321", "Text Link List", '''
    <ul className="link-list">
      {links.map(link => (
        <li key={link.href}>
          <a href={link.href} className="text-link">{link.label}</a>
        </li>
      ))}
    </ul>
    '''),

    ("TextList", "480:6149", "Text List", '''
    <ul className="text-list">
      {items.map(item => (
        <li key={item} className="text-list-item">{item}</li>
      ))}
    </ul>
    '''),

    ("TextPrice", "1443:10386", "Text Price", '''
    <div className="text-price">
      {originalPrice && (
        <span className="price-original">₹{originalPrice.toLocaleString()}</span>
      )}
      <span className="price-current">₹{price.toLocaleString()}</span>
      {discount && <span className="price-discount">{discount}% off</span>}
    </div>
    '''),

    # ── Pagination ──
    ("PaginationPrevious", "9762:880", "Pagination Previous", '''
    <button
      className="pagination-btn pagination-prev"
      disabled={currentPage === 1}
      onClick={() => setPage(currentPage - 1)}
    >
      ← Previous
    </button>
    '''),

    ("PaginationPage", "9762:890", "Pagination Page", '''
    <button
      className={`pagination-btn pagination-page ${isCurrent ? "pagination-active" : ""}`}
      aria-current={isCurrent ? "page" : undefined}
      onClick={() => setPage(pageNumber)}
    >
      {pageNumber}
    </button>
    '''),

    ("PaginationNext", "9762:870", "Pagination Next", '''
    <button
      className="pagination-btn pagination-next"
      disabled={currentPage === totalPages}
      onClick={() => setPage(currentPage + 1)}
    >
      Next →
    </button>
    '''),

    # ── Menu ──
    ("MenuItem", "9762:743", "Menu Item", '''
    <button
      className={`menu-item ${isActive ? "menu-item-active" : ""}`}
      role="menuitem"
      onClick={() => onSelect(item)}
    >
      {item.icon && <span className="menu-item-icon">{item.icon}</span>}
      <span className="menu-item-label">{item.label}</span>
    </button>
    '''),

    # ── Calendar ──
    ("CalendarButton", "4333:9359", "Calendar Button", '''
    <button
      className={`calendar-btn ${isSelected ? "calendar-selected" : ""} ${isToday ? "calendar-today" : ""}`}
      onClick={() => onSelectDate(date)}
    >
      {date.getDate()}
    </button>
    '''),

    # ── AI ──
    ("AIChatBox", "4309:7636", "AI Chat Box", '''
    <div className="ai-chat-box">
      <div className="ai-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-message ai-message-${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="ai-input">
        <input
          type="text"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-primary" onClick={onSend}>Send</button>
      </div>
    </div>
    '''),

    # ── Page Compositions ──
    ("CardGridContentList", "348:13407", "Card Grid Content List", '''
    <section className="card-grid card-grid-content">
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="grid grid-cols-3">
        {items.map(item => (
          <div key={item.id} className="card">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
    '''),

    ("CardGridIcon", "348:13221", "Card Grid Icon", '''
    <section className="card-grid card-grid-icon">
      <div className="grid grid-cols-3">
        {items.map(item => (
          <div key={item.id} className="card card-icon">
            <span className="card-icon-symbol">{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        ))}
      </div>
    </section>
    '''),

    ("CardGridImage", "348:14431", "Card Grid Image", '''
    <section className="card-grid card-grid-image">
      <div className="grid grid-cols-3">
        {products.map(p => (
          <div key={p.id} className="card">
            <img className="card-image" src={p.imageUrl} alt={p.name} />
            <div className="card-body">
              <h3>{p.name}</h3>
              <span className="price">₹{p.price}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
    '''),

    ("CardGridPricing", "348:14983", "Card Grid Pricing", '''
    <section className="card-grid card-grid-pricing">
      <div className="grid grid-cols-3">
        {plans.map(plan => (
          <div key={plan.id} className="card pricing-card">
            <h3>{plan.name}</h3>
            <span className="price">₹{plan.price}/mo</span>
            <button className="btn btn-primary">Choose</button>
          </div>
        ))}
      </div>
    </section>
    '''),

    ("CardGridReviews", "348:15213", "Card Grid Reviews", '''
    <section className="card-grid card-grid-reviews">
      <div className="grid grid-cols-2">
        {reviews.map(r => (
          <div key={r.id} className="card review-card">
            <div className="review-stars">{"★".repeat(r.rating)}</div>
            <p>{r.text}</p>
            <span className="review-author">{r.author}</span>
          </div>
        ))}
      </div>
    </section>
    '''),

    ("CardGridTestimonials", "348:13347", "Card Grid Testimonials", '''
    <section className="card-grid card-grid-testimonials">
      <div className="grid grid-cols-3">
        {testimonials.map(t => (
          <div key={t.id} className="card testimonial-card">
            <blockquote>{t.quote}</blockquote>
            <cite>{t.author}, {t.role}</cite>
          </div>
        ))}
      </div>
    </section>
    '''),

    # ── Hero Sections ──
    ("HeroBasic", "348:15896", "Hero Basic", '''
    <section className="hero hero-basic">
      <h1 className="hero-title">{title}</h1>
      <p className="hero-subtitle">{subtitle}</p>
    </section>
    '''),

    ("HeroActions", "348:15901", "Hero Actions", '''
    <section className="hero hero-actions">
      <h1 className="hero-title">{title}</h1>
      <p className="hero-subtitle">{subtitle}</p>
      <div className="hero-cta">
        <button className="btn btn-primary btn-lg">{primaryCta}</button>
        <button className="btn btn-secondary btn-lg">{secondaryCta}</button>
      </div>
    </section>
    '''),

    ("HeroNewsletter", "348:15919", "Hero Newsletter", '''
    <section className="hero hero-newsletter">
      <h1 className="hero-title">{title}</h1>
      <form className="hero-form" onSubmit={onSubscribe}>
        <input type="email" placeholder="Enter email" className="field-input" />
        <button className="btn btn-primary">Subscribe</button>
      </form>
    </section>
    '''),

    ("HeroForm", "348:15933", "Hero Form", '''
    <section className="hero hero-form">
      <div className="hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <form className="hero-form-panel">
        <div className="field">
          <input className="field-input" placeholder="Name" />
        </div>
        <div className="field">
          <input className="field-input" placeholder="Email" />
        </div>
        <button className="btn btn-primary btn-lg">Get Started</button>
      </form>
    </section>
    '''),

    ("HeroImage", "348:15970", "Hero Image", '''
    <section className="hero hero-image">
      <div className="hero-content">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <button className="btn btn-primary btn-lg">{cta}</button>
      </div>
      <div className="hero-media">
        <img src={imageUrl} alt={title} />
      </div>
    </section>
    '''),

    # ── Page / Panel Sections ──
    ("PageAccordion", "348:13173", "Page Accordion", '''
    <section className="page-section page-accordion">
      <h2>{title}</h2>
      {items.map(item => (
        <details key={item.id} className="accordion-item">
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </section>
    '''),

    ("PageNewsletter", "348:15133", "Page Newsletter", '''
    <section className="page-section page-newsletter">
      <h2>{title}</h2>
      <p>{description}</p>
      <form onSubmit={onSubscribe}>
        <input className="field-input" type="email" placeholder="Email" />
        <button className="btn btn-primary">Subscribe</button>
      </form>
    </section>
    '''),

    ("PageProduct", "348:15147", "Page Product", '''
    <section className="page-section page-product">
      <div className="product-image">
        <img src={product.imageUrl} alt={product.name} />
      </div>
      <div className="product-info">
        <h2>{product.name}</h2>
        <span className="price">₹{product.price}</span>
        <p>{product.description}</p>
        <button className="btn btn-primary">Add to Cart</button>
      </div>
    </section>
    '''),

    ("PageProductResults", "348:13517", "Page Product Results", '''
    <section className="page-section page-results">
      <div className="results-header">
        <h2>{title}</h2>
        <span>{totalResults} results</span>
      </div>
      <div className="grid grid-cols-4">
        {products.map(p => (
          <div key={p.id} className="card">
            <img src={p.imageUrl} alt={p.name} />
            <h3>{p.name}</h3>
            <span>₹{p.price}</span>
          </div>
        ))}
      </div>
    </section>
    '''),

    ("PanelImage", "348:15098", "Panel Image", '''
    <section className="panel panel-image">
      <img src={imageUrl} alt={title} className="panel-img" />
      <div className="panel-content">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </section>
    '''),

    ("PanelImageContent", "348:13474", "Panel Image Content", '''
    <section className="panel panel-image-content">
      <div className="panel-media">
        <img src={imageUrl} alt={title} />
      </div>
      <div className="panel-body">
        <h2>{title}</h2>
        <p>{description}</p>
        <button className="btn btn-primary">{cta}</button>
      </div>
    </section>
    '''),

    ("PanelImageContentReverse", "348:15101", "Panel Image Content Reverse", '''
    <section className="panel panel-image-content panel-reverse">
      <div className="panel-body">
        <h2>{title}</h2>
        <p>{description}</p>
        <button className="btn btn-primary">{cta}</button>
      </div>
      <div className="panel-media">
        <img src={imageUrl} alt={title} />
      </div>
    </section>
    '''),

    ("PanelImageDouble", "348:13470", "Panel Image Double", '''
    <section className="panel panel-image-double">
      <div className="panel-media">
        <img src={image1Url} alt={title1} />
      </div>
      <div className="panel-media">
        <img src={image2Url} alt={title2} />
      </div>
    </section>
    '''),
]


def node_url(node_id: str) -> str:
    """Build Figma node URL from node ID."""
    return f"{BASE_URL}?node-id={node_id.replace(':', '-')}"


def generate_connector(filename: str, node_id: str, component_name: str, example_jsx: str) -> str:
    """Generate a Code Connect .figma.tsx file."""
    # Clean up JSX indentation
    lines = example_jsx.strip().split('\n')
    # Find minimum indentation
    min_indent = float('inf')
    for line in lines:
        stripped = line.lstrip()
        if stripped:
            min_indent = min(min_indent, len(line) - len(stripped))
    if min_indent == float('inf'):
        min_indent = 0
    
    cleaned_lines = []
    for line in lines:
        cleaned_lines.append('    ' + line[min_indent:] if line.strip() else '')
    
    jsx_block = '\n'.join(cleaned_lines)
    
    url = node_url(node_id)
    
    return f'''import figma from "@figma/code-connect"

// {component_name} — Design System Component
// Figma node: {node_id}
figma.connect("{url}", {{
  example: () => (
{jsx_block}
  ),
}})
'''


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    created = []
    for filename, node_id, name, jsx in DS_COMPONENTS:
        filepath = os.path.join(OUT_DIR, f"{filename}.figma.tsx")
        content = generate_connector(filename, node_id, name, jsx)
        with open(filepath, 'w') as f:
            f.write(content)
        created.append((filename, node_id, name))
    
    print(f"Generated {len(created)} DS component connectors in {OUT_DIR}/")
    print()
    for filename, node_id, name in created:
        print(f"  ✓ {filename}.figma.tsx → {name} ({node_id})")
    
    # Also update mappings.source.json
    mappings_path = os.path.join(os.path.dirname(__file__), "..", "figma", "code-connect", "mappings.source.json")
    if os.path.exists(mappings_path):
        with open(mappings_path) as f:
            data = json.load(f)
    else:
        data = {"version": 1, "fileKey": FIGMA_FILE_KEY, "mappings": []}
    
    mappings_list = data.get("mappings", [])
    
    # Remove existing DS entries
    mappings_list = [m for m in mappings_list if m.get('label') != 'DS']
    
    # Add new DS entries
    for filename, node_id, name in created:
        mappings_list.append({
            "id": filename.lower(),
            "componentName": name,
            "nodeId": node_id,
            "label": "DS",
            "source": f"figma/code-connect/components/ds/{filename}.figma.tsx"
        })
    
    data["mappings"] = mappings_list
    
    with open(mappings_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"\nUpdated {mappings_path} with {len(created)} DS entries (total: {len(mappings_list)})")


if __name__ == "__main__":
    main()
