import { createActionId, createBlock } from './message';

const PLANTS = 'https://api.slack.com/img/blocks/bkb_template_images/plants.png';

export function buildAnnouncement() {
  return [
    createBlock('header', { text: 'Planning week starts Monday' }),
    createBlock('section', {
      text: 'Team — *draft goals are due Friday at 3:00pm ET* so we can lock the roadmap before the offsite.\n\n• Share one outcome you own\n• Flag any dependency on Design or Data\n• Drop a link to your working doc\n\nDecisions made after Friday _slip to next month_. The working doc is <https://example.com/planning|Q2 planning>.',
    }),
    createBlock('section', {
      text: 'Add the Monday kickoff to your calendar so the week does not sneak up on you.',
      accessory: {
        kind: 'button',
        label: 'Add to calendar',
        style: 'primary',
        url: 'https://example.com/calendar',
        actionId: createActionId(),
        value: 'calendar',
      },
    }),
    createBlock('divider'),
    createBlock('context', {
      elements: [{
        kind: 'text',
        text: 'People Ops  ·  #announcements  ·  Replies in thread',
        textType: 'mrkdwn',
        emoji: true,
      }],
    }),
    createBlock('actions', {
      buttons: [
        {
          label: 'View agenda',
          style: 'default',
          url: 'https://example.com/agenda',
          actionId: createActionId(),
          value: 'agenda',
        },
        {
          label: 'I have a conflict',
          style: 'danger',
          url: '',
          actionId: createActionId(),
          value: 'conflict',
        },
      ],
    }),
  ];
}

export function buildProductUpdate() {
  return [
    createBlock('header', { text: 'Ship notes · Release 2.8' }),
    createBlock('section', {
      text: '*Search is faster*, and filters now stick between visits. Build `2.8.0` is live for Pro workspaces today.\n\nThe old filter bar is ~gone~. _No action is required_ — this rolls out on its own.\n\nQuestions go to <https://example.com/notes|the release notes>.',
    }),
    createBlock('image', {
      title: 'Photo from the launch note',
      imageUrl: PLANTS,
      altText: 'Desk plants beside a notebook',
    }),
    createBlock('divider'),
    createBlock('context', {
      elements: [{
        kind: 'text',
        text: 'Rolled out to Pro workspaces  ·  #product-updates',
        textType: 'mrkdwn',
        emoji: true,
      }],
    }),
    createBlock('actions', {
      buttons: [
        {
          label: 'Read the notes',
          style: 'primary',
          url: 'https://example.com/notes',
          actionId: createActionId(),
          value: 'notes',
        },
        {
          label: 'Contact support',
          style: 'default',
          url: 'https://example.com/support',
          actionId: createActionId(),
          value: 'support',
        },
      ],
    }),
  ];
}

export function buildIncident() {
  return [
    createBlock('header', { text: 'Incident · Checkout latency' }),
    createBlock('section', {
      text: '*SEV-2* — checkout p95 has been above 4s since 09:14 ET.\n\n• Impact: web checkout in US-East\n• Status: mitigating\n• Next update: 15 minutes\n\nCustomer impact is ~not sitewide~. The bridge is <https://example.com/bridge|open now>. Please keep speculation out of customer channels.',
    }),
    createBlock('actions', {
      buttons: [
        {
          label: 'Open status page',
          style: 'primary',
          url: 'https://example.com/status',
          actionId: createActionId(),
          value: 'status',
        },
        {
          label: 'Page the commander',
          style: 'danger',
          url: '',
          actionId: createActionId(),
          value: 'page',
        },
      ],
    }),
    createBlock('context', {
      elements: [{
        kind: 'text',
        text: 'Commander: Priya Shah  ·  #inc-checkout',
        textType: 'mrkdwn',
        emoji: true,
      }],
    }),
  ];
}

export const TEMPLATES = [
  {
    id: 'announcement',
    name: 'Team announcement',
    description: 'Goals, a date, and a calendar link',
    build: buildAnnouncement,
  },
  {
    id: 'product',
    name: 'Product update',
    description: 'Release notes with a photo',
    build: buildProductUpdate,
  },
  {
    id: 'incident',
    name: 'Incident alert',
    description: 'Status, impact, and a bridge',
    build: buildIncident,
  },
  {
    id: 'blank',
    name: 'Blank',
    description: 'An empty message',
    build: () => [],
  },
];
