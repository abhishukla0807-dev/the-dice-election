import akhilesh from '../assets/images/candidates/akhilesh-yadav.png';
import modi from '../assets/images/candidates/narendra-modi.jpg';
import rahul from '../assets/images/candidates/rahul-gandhi.jpg';
import yogi from '../assets/images/candidates/yogi-adityanath.png';
import bjpLotus from '../assets/images/symbols/bjp-lotus.png';
import congressHand from '../assets/images/symbols/congress-hand.png';
import spCycle from '../assets/images/symbols/sp-cycle.png';

/**
 * Content lives here, not in components. Adding a matchup = adding an entry.
 * `crop` is the focal point used when the photo is cropped to a square.
 */
const bjp = {
  name: 'Bharatiya Janata Party',
  symbol: { src: bjpLotus, alt: 'Lotus symbol', width: 88, height: 88 },
};

/** Sample state shown on first paint, before the first roll. */
const sampleInitial = (ids, [a, b]) => ({
  scores: { [ids[0]]: a, [ids[1]]: b },
  rollCount: 12,
  history: [
    { id: ids[1], value: 4, roll: 12 },
    { id: ids[0], value: 3, roll: 11 },
    { id: ids[1], value: 3, roll: 10 },
    { id: ids[0], value: 6, roll: 9 },
  ],
});

export const matchups = [
  {
    slug: 'rahul-vs-modi',
    isHome: true,
    navLabel: 'Rahul vs Modi',
    title: 'The Dice Election: Rahul Gandhi vs Narendra Modi',
    candidates: [
      {
        id: 'rahul',
        name: 'Rahul Gandhi',
        shortName: 'Rahul Gandhi',
        photo: rahul,
        crop: 'top',
        party: {
          name: 'Indian National Congress',
          symbol: { src: congressHand, alt: 'Open hand symbol', width: 88, height: 88 },
        },
        theme: { accent: '#1d4ed8', tint: '#dbeafe', bar: '#1d4ed8', dot: '#60a5fa' },
      },
      {
        id: 'modi',
        name: 'Narendra Modi',
        shortName: 'Narendra Modi',
        photo: modi,
        crop: 'centre',
        party: bjp,
        theme: { accent: '#b45309', tint: '#fef3c7', bar: '#f59e0b', dot: '#fbbf24' },
      },
    ],
    initial: sampleInitial(['rahul', 'modi'], [27, 24]),
  },
  {
    slug: 'akhilesh-vs-yogi',
    navLabel: 'Akhilesh vs Yogi',
    title: 'The Dice Election: Akhilesh Yadav vs Yogi Adityanath',
    candidates: [
      {
        id: 'akhilesh',
        name: 'Akhilesh Yadav',
        shortName: 'Akhilesh Yadav',
        photo: akhilesh,
        crop: 'right',
        party: {
          name: 'Samajwadi Party',
          symbol: { src: spCycle, alt: 'Bicycle symbol', width: 112, height: 67 },
        },
        theme: { accent: '#0f766e', tint: '#ccfbf1', bar: '#0f766e', dot: '#2dd4bf' },
      },
      {
        id: 'yogi',
        name: 'Ajay Bisht (Yogi Adityanath)',
        shortName: 'Yogi Adityanath',
        photo: yogi,
        crop: 'top',
        party: bjp,
        theme: { accent: '#6d28d9', tint: '#ede9fe', bar: '#8b5cf6', dot: '#a78bfa' },
      },
    ],
    initial: sampleInitial(['akhilesh', 'yogi'], [27, 24]),
  },
];
