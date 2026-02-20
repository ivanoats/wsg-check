import type { GuidelineEntry } from './types.js'

/**
 * Registry of W3C Web Sustainability Guidelines (WSG).
 *
 * Each entry documents a guideline's ID, title, section, category,
 * machine-testability level, and a brief description.
 *
 * Testability levels:
 *   - automated:       Can be fully checked programmatically
 *   - semi-automated:  Partially checkable; human judgment required
 *   - manual-only:     Requires human review
 *
 * @see https://www.w3.org/TR/web-sustainability-guidelines/
 */
export const GUIDELINES_REGISTRY: GuidelineEntry[] = [
  // ─── Section 2: User Experience Design ──────────────────────────────────────
  {
    id: '2.1',
    title: 'Undertake Systemic Impacts Mapping',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Identify and map the direct and indirect environmental and social impacts of your product or service throughout its lifecycle.',
  },
  {
    id: '2.2',
    title: 'Assess and Research Visitor Needs',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Research the needs of your visitors to ensure the product delivers genuine value and avoids unnecessary resource consumption.',
  },
  {
    id: '2.3',
    title: 'Research Non-Human Actors',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Identify bots, crawlers, and automated agents that interact with your service and ensure they are served appropriately.',
  },
  {
    id: '2.4',
    title: 'Consider Sustainability in Early Ideation',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Incorporate sustainability criteria into the ideation and design process from the outset.',
  },
  {
    id: '2.5',
    title: 'Account for Stakeholder Issues',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Engage stakeholders (including users, operators, and affected communities) and address their concerns in the design process.',
  },
  {
    id: '2.6',
    title: 'Create a Frictionless Lightweight Experience by Default',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Provide the lightest possible experience that satisfies user needs, reducing data transfer and processing demands.',
  },
  {
    id: '2.7',
    title: 'Avoid Unnecessary or an Overabundance of Assets',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Minimize decorative assets and avoid content that does not serve user goals, reducing page weight and energy use.',
  },
  {
    id: '2.8',
    title: 'Ensure Navigation and Way-Finding Are Well-Structured',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Provide clear, logical navigation so visitors find content quickly, reducing unnecessary page loads.',
  },
  {
    id: '2.9',
    title: "Respect the Visitor's Attention",
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Avoid dark patterns, excessive notifications, and auto-playing media that consume user time and device resources.',
  },
  {
    id: '2.10',
    title: 'Avoid Manipulative Patterns',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Do not use deceptive design patterns (dark patterns) that manipulate users into actions against their interests.',
  },
  {
    id: '2.11',
    title: 'Avoid Bloated or Unnecessary Content',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Remove or archive outdated content and avoid padding pages with redundant material.',
  },
  {
    id: '2.12',
    title: 'Document and Share Project Outputs',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Share design decisions, research, and outcomes openly to foster learning and reduce duplicated effort across the industry.',
  },
  {
    id: '2.13',
    title: 'Use Recognized Design Patterns',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Leverage established UX patterns so users can accomplish tasks with minimal cognitive effort and fewer interactions.',
  },
  {
    id: '2.14',
    title: 'Implement Passive and Low-Intensity Features',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Offer passive or low-resource alternatives to high-intensity interactive features.',
  },
  {
    id: '2.15',
    title: 'Use Animations Responsibly',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Limit animations to those that serve user needs, prefer CSS over JS animations, and honour prefers-reduced-motion.',
  },
  {
    id: '2.16',
    title: 'Ensure Content Is Readable Without Custom Fonts',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'automated',
    description:
      'Use system fonts or provide effective fallbacks so pages are readable even when custom fonts fail to load.',
  },
  {
    id: '2.17',
    title: 'Provide Suitable Alternatives to Web Assets',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Supply text alternatives, transcripts, and accessible formats for media and complex visuals.',
  },
  {
    id: '2.18',
    title: 'Consider Dark Mode',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'automated',
    description:
      'Support a dark color scheme via prefers-color-scheme to reduce energy consumption on OLED/AMOLED displays.',
  },
  {
    id: '2.19',
    title: 'Support Native User Interface Features',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'semi-automated',
    description:
      'Use platform-native UI controls where possible to reduce JS weight and improve accessibility.',
  },
  {
    id: '2.20',
    title: 'Provide Print Stylesheet Alternatives',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'automated',
    description:
      'Include print styles that remove unnecessary navigation and decorative elements to reduce ink and paper use.',
  },
  {
    id: '2.21',
    title: 'Align Visual Design with Sustainability',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Communicate sustainability values through visual choices such as colour, imagery, and typography.',
  },
  {
    id: '2.22',
    title: 'Avoid Unnecessary Scroll',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Structure content so users find what they need without excessive scrolling, reducing time-on-device.',
  },
  {
    id: '2.23',
    title: 'Promote Sustainable Use of Data',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Give users control over their data, minimise collection, and avoid retention beyond necessity.',
  },
  {
    id: '2.24',
    title: 'Consider Sustainability in Content',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description: 'Embed sustainability messaging in editorial content where relevant and accurate.',
  },
  {
    id: '2.25',
    title: 'Reduce Cognitive Load',
    section: 'User Experience Design',
    category: 'ux',
    testability: 'manual-only',
    description:
      'Design interfaces that minimise mental effort, helping users complete tasks with fewer errors and less time.',
  },

  // ─── Section 3: Web Development ─────────────────────────────────────────────
  {
    id: '3.1',
    title: 'Identify Redundant Functionality',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'manual-only',
    description:
      'Audit the codebase for duplicate, dead, or superseded functionality and remove it to reduce overhead.',
  },
  {
    id: '3.2',
    title: 'Address the Situation When Websites Are Unavailable',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Provide offline pages or service-worker fallbacks so users receive a useful response even when connectivity is poor.',
  },
  {
    id: '3.3',
    title: 'Minify Your HTML, CSS, and JavaScript',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Remove unnecessary whitespace, comments, and dead code from served assets to reduce transfer size.',
  },
  {
    id: '3.4',
    title: 'Use Metadata Correctly',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Include accurate page metadata (title, description, Open Graph) to reduce unnecessary visits caused by misleading previews.',
  },
  {
    id: '3.5',
    title: 'Reduce Duplicate Code',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Identify and consolidate repeated code patterns to shrink bundle sizes and reduce maintenance burden.',
  },
  {
    id: '3.6',
    title: 'Avoid Unnecessary Code Duplication',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description: 'Prefer shared libraries and components over copy-pasted implementations.',
  },
  {
    id: '3.7',
    title: 'Rigorously Assess Third-Party Services',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Evaluate the sustainability impact of third-party scripts, trackers, and widgets before including them.',
  },
  {
    id: '3.8',
    title: 'Use HTML Elements Correctly',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Use semantic HTML elements to improve accessibility and reduce reliance on heavy CSS/JS workarounds.',
  },
  {
    id: '3.9',
    title: 'Resolve Render Blocking Content',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Remove or defer resources that block page rendering to reduce time-to-interactive and energy use.',
  },
  {
    id: '3.10',
    title: 'Provide Code-Based Way-Finding Mechanisms',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Include sitemap.xml, robots.txt, and structured navigation landmarks to assist bots and assistive technology.',
  },
  {
    id: '3.11',
    title: 'Avoid Deprecated or Proprietary Code',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Remove deprecated APIs and vendor-specific prefixes to keep code lean and forward-compatible.',
  },
  {
    id: '3.12',
    title: 'Validate Forms',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Use client- and server-side validation to reduce failed submissions and unnecessary round-trips.',
  },
  {
    id: '3.13',
    title: 'Use Metadata, Microdata, and Schema.org',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Add structured data so search engines can display rich results, reducing clicks needed to find information.',
  },
  {
    id: '3.14',
    title: 'Provide Accessible, Usable, Minimal Forms',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Design forms with only necessary fields, clear labels, and accessible error handling.',
  },
  {
    id: '3.15',
    title: 'Provide Useful Error Pages',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Return informative 404 and error pages that help users navigate to their destination without wasted requests.',
  },
  {
    id: '3.16',
    title: 'Recognize Errors and Inform the Visitor',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Surface clear, actionable error messages so visitors can recover without contacting support.',
  },
  {
    id: '3.17',
    title: 'Use Beneficial Standards',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Adopt open web standards and publish machine-readable files (robots.txt, sitemap.xml, security.txt, humans.txt).',
  },
  {
    id: '3.18',
    title: 'Ensure Your Site Is Indexed Correctly',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Configure canonical URLs and indexing directives to prevent duplicate content and reduce crawler load.',
  },
  {
    id: '3.19',
    title: 'Reduce the Impact of Scrolling Content',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Implement lazy loading and pagination to avoid loading content the visitor never sees.',
  },
  {
    id: '3.20',
    title: 'Provide Accessible, Performant Images',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Serve images in modern formats (WebP, AVIF), sized appropriately, with descriptive alt text and lazy loading.',
  },
  {
    id: '3.21',
    title: 'Serve Fonts Efficiently',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Subset fonts, use font-display swap, and self-host to minimise render-blocking and unnecessary data transfer.',
  },
  {
    id: '3.22',
    title: 'Ensure Videos Are Optimized',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Compress video assets, provide captions, avoid autoplay, and use efficient codecs (AV1, HEVC).',
  },
  {
    id: '3.23',
    title: 'Reduce the Impact of Animation',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Use CSS animations rather than JS where possible and implement prefers-reduced-motion support.',
  },
  {
    id: '3.24',
    title: 'Use Efficient CSS Selectors',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'semi-automated',
    description:
      'Avoid overly broad or deeply nested CSS selectors that force expensive style recalculations.',
  },
  {
    id: '3.25',
    title: 'Use the Latest Stable Language Version',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Use modern, efficient language features and avoid polyfills for widely-supported APIs.',
  },
  {
    id: '3.26',
    title: 'Identify Errors and Status Codes Appropriately',
    section: 'Web Development',
    category: 'web-dev',
    testability: 'automated',
    description:
      'Return correct HTTP status codes so clients and intermediaries can cache, retry, or handle responses efficiently.',
  },

  // ─── Section 4: Hosting, Infrastructure and Systems ─────────────────────────
  {
    id: '4.1',
    title: 'Choose a Sustainable Hosting Provider',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'semi-automated',
    description:
      'Select a hosting provider that uses renewable energy and publishes sustainability commitments.',
  },
  {
    id: '4.2',
    title: 'Optimize Browser Caching',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'automated',
    description:
      'Set appropriate cache-control headers so browsers and CDNs cache assets, reducing repeat downloads.',
  },
  {
    id: '4.3',
    title: 'Use Content Delivery Networks',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'semi-automated',
    description:
      'Distribute static assets via a CDN to reduce round-trip latency and data-centre energy consumption.',
  },
  {
    id: '4.4',
    title: 'Avoid Redirects Where Possible',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'automated',
    description:
      'Minimise HTTP redirects to reduce unnecessary requests and the associated latency and energy use.',
  },
  {
    id: '4.5',
    title: 'Limit Usage of Additional Environments',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'manual-only',
    description:
      'Consolidate staging, development, and testing environments to reduce idle infrastructure overhead.',
  },
  {
    id: '4.6',
    title: 'Implement Lean Data Strategies',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'semi-automated',
    description:
      'Collect only the data you need, archive or delete stale data, and optimise database queries.',
  },
  {
    id: '4.7',
    title: 'Compress Files and Data',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'automated',
    description:
      'Enable gzip or Brotli compression on the server to reduce the size of transferred resources.',
  },
  {
    id: '4.8',
    title: 'Use Efficient Cache Policies',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'automated',
    description:
      'Apply long-lived cache headers to immutable assets and short-lived headers to frequently updated content.',
  },
  {
    id: '4.9',
    title: 'Consider Serverless, Containerized, or Virtualized Infrastructure',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'manual-only',
    description:
      'Use serverless or container-based infrastructure to scale to zero and reduce idle resource consumption.',
  },
  {
    id: '4.10',
    title: 'Monitor and Improve Operational Efficiency',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'manual-only',
    description:
      'Continuously monitor server performance and efficiency metrics and act on findings.',
  },
  {
    id: '4.11',
    title: 'Use Edge Computing',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'manual-only',
    description:
      'Process requests at the network edge where beneficial to reduce latency and central data-centre load.',
  },
  {
    id: '4.12',
    title: 'Apply Appropriate Security Measures',
    section: 'Hosting, Infrastructure and Systems',
    category: 'hosting',
    testability: 'automated',
    description:
      'Use HTTPS, security headers, and dependency auditing to prevent attacks that waste resources.',
  },

  // ─── Section 5: Business Strategy and Product Management ─────────────────────
  {
    id: '5.1',
    title: 'Have an Ethical and Sustainability Product Strategy',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'manual-only',
    description:
      'Define and communicate a strategy that places sustainability at the core of product decisions.',
  },
  {
    id: '5.2',
    title: 'Assign a Sustainability Champion',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'manual-only',
    description:
      'Designate a team member responsible for tracking and improving sustainability outcomes.',
  },
  {
    id: '5.3',
    title: 'Support Open Source and Open Standards',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'manual-only',
    description:
      'Contribute to and rely on open-source software and open standards to reduce duplicated environmental cost.',
  },
  {
    id: '5.4',
    title: 'Engage and Educate Stakeholders',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'manual-only',
    description:
      'Communicate sustainability goals and progress to all stakeholders including clients, leadership, and users.',
  },
  {
    id: '5.5',
    title: 'Use Sustainable Design Patterns',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'manual-only',
    description:
      'Adopt and share design patterns that reduce the environmental footprint of digital products.',
  },
  {
    id: '5.6',
    title: 'Avoid Unnecessary Resource Requests',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'semi-automated',
    description:
      'Audit features regularly and remove those that are rarely used or generate disproportionate resource costs.',
  },
  {
    id: '5.7',
    title: 'Establish if a Digital Solution Is Necessary',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'manual-only',
    description:
      'Question whether a digital product is the most sustainable answer to a problem before building it.',
  },
  {
    id: '5.8',
    title: 'Contribute to Sustainability Efforts',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'manual-only',
    description:
      'Participate in industry sustainability initiatives and share learnings to accelerate collective progress.',
  },
  {
    id: '5.9',
    title: 'Communicate Sustainability Commitments',
    section: 'Business Strategy and Product Management',
    category: 'business',
    testability: 'semi-automated',
    description:
      'Publish a sustainability statement or environmental policy that is accessible from the website.',
  },
]

/**
 * Look up a guideline entry by its ID (e.g. "3.1").
 * Returns undefined if the ID is not found.
 */
export function getGuidelineById(id: string): GuidelineEntry | undefined {
  return GUIDELINES_REGISTRY.find((g) => g.id === id)
}

/**
 * Return all guidelines for a given category.
 */
export function getGuidelinesByCategory(category: GuidelineEntry['category']): GuidelineEntry[] {
  return GUIDELINES_REGISTRY.filter((g) => g.category === category)
}

/**
 * Return all guidelines with a specific testability level.
 */
export function getGuidelinesByTestability(
  testability: GuidelineEntry['testability']
): GuidelineEntry[] {
  return GUIDELINES_REGISTRY.filter((g) => g.testability === testability)
}
