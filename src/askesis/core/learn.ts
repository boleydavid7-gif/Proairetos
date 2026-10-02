/**
 * Short reads on why the plans are built the way they are. Each piece
 * names its sources. They explain; they never tell anyone what they must do.
 */
export type Category = 'foundations' | 'training' | 'health';

export type Article = {
  id: string;
  category: Category;
  title: string;
  line: string;
  minutes: number;
  scene: string;
  sections: { heading?: string; text: string }[];
  takeaway: string;
  sources: string[];
};

export const categories: Record<Category, string> = {
  foundations: 'Foundations',
  training: 'Training',
  health: 'Health',
};

export const articles: Article[] = [
  {
    id: 'fundamentals',
    category: 'foundations',
    title: 'The cardio fundamentals',
    line: 'What cardio is, and what it changes in the body.',
    minutes: 5,
    scene: 'alpine-dusk',
    sections: [
      {
        heading: 'What is cardio?',
        text: 'Cardio, or aerobic exercise, is any sustained activity that raises your breathing and heart rate for minutes at a time: running, brisk walking, cycling, swimming, rowing. "Aerobic" means the muscles are mostly using oxygen to release energy from fat and carbohydrate.',
      },
      {
        heading: 'What changes when you train',
        text: 'With regular training the heart pumps more blood with each beat, so your resting heart rate often falls. Muscles grow more capillaries, which bring them blood, and more mitochondria, which use oxygen to make energy. Together these let you go further at the same effort, and recover faster.',
      },
      {
        heading: 'How much is enough?',
        text: "The World Health Organization's guidelines for adults are 150 to 300 minutes of moderate activity a week, or 75 to 150 minutes of vigorous activity, or a mix. Any amount helps, and more brings more benefit up to a point. A beginner plan of three 30-minute sessions already reaches the lower end.",
      },
      {
        heading: 'Why it takes weeks',
        text: 'The heart and lungs adapt within weeks. Tendons, ligaments and bones adapt more slowly, over months. That is why the plans grow gradually even when your breathing says you could do more.',
      },
    ],
    takeaway: 'Cardio builds a stronger heart, better-supplied muscles, and endurance, at any age. The body adapts to what you repeat.',
    sources: [
      'Bull FC, et al. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. Br J Sports Med. 2020;54(24):1451-1462.',
      'Hellsten Y, Nyberg M. Cardiovascular adaptations to exercise training. Compr Physiol. 2015;6(1):1-32.',
    ],
  },
  {
    id: 'energy-systems',
    category: 'foundations',
    title: 'Energy systems explained',
    line: 'Aerobic and anaerobic, and where threshold fits.',
    minutes: 6,
    scene: 'misty-lake',
    sections: [
      {
        heading: 'Two ways to make energy',
        text: 'Muscles make energy two ways. The aerobic system uses oxygen and can run for hours on fat and carbohydrate. The anaerobic system works without enough oxygen: it is fast and powerful, but it only lasts seconds to a few minutes.',
      },
      {
        heading: 'Lactate is fuel, not waste',
        text: 'Hard running produces lactate. It was long blamed for tiredness, but it is a fuel the heart and muscles reuse. At easy efforts the body clears it as fast as it is made. Above a certain effort, called the lactate threshold, it builds up faster than it clears, and the effort can only be held for a limited time.',
      },
      {
        heading: 'Why this shapes training',
        text: 'Easy running builds the aerobic engine with little strain. Threshold sessions ("comfortably hard") push the threshold higher, so a faster pace stays sustainable. Short hard intervals raise the ceiling, your maximum oxygen uptake (VO2 max). A good plan uses all three, with easy running as the foundation.',
      },
    ],
    takeaway: 'Easy running builds the engine; threshold work raises the pace you can hold; intervals raise the ceiling.',
    sources: [
      'Brooks GA. The science and translation of lactate shuttle theory. Cell Metab. 2018;27(4):757-785.',
      'Joyner MJ, Coyle EF. Endurance exercise performance: the physiology of champions. J Physiol. 2008;586(1):35-44.',
    ],
  },
  {
    id: 'effort',
    category: 'foundations',
    title: 'How hard is hard?',
    line: 'Effort by feel: the talk test and a 0 to 10 scale.',
    minutes: 4,
    scene: 'cloud-sky',
    sections: [
      {
        heading: 'Effort, not pace',
        text: 'The plans here ask for an effort, not a pace. Effort works on hills, in heat, on tired days, and without any device. Pace changes with all of those.',
      },
      {
        heading: 'The talk test',
        text: 'Easy: you can talk in full sentences. Steady: short sentences. Comfortably hard: a few words at a time. Hard: a word or two. Researchers have found the talk test tracks the thresholds measured in a lab well.',
      },
      {
        heading: 'A scale from 0 to 10',
        text: "Perceived effort on a 0 to 10 scale (based on Borg's CR10 scale) is used by coaches and researchers to describe a session. Easy is about 3 to 4, comfortably hard 6 to 7, hard 8 to 9. Your rating after a workout, the feeling you note in the log, is the same idea.",
      },
    ],
    takeaway: 'If you can talk in full sentences, it is easy. Most of your running lives there.',
    sources: [
      'Borg GA. Psychophysical bases of perceived exertion. Med Sci Sports Exerc. 1982;14(5):377-381.',
      'Foster C, et al. A new approach to monitoring exercise training. J Strength Cond Res. 2001;15(1):109-115.',
      'Reed JL, Pipe AL. The talk test: a useful tool for prescribing and monitoring exercise intensity. Curr Opin Cardiol. 2014;29(5):475-480.',
    ],
  },
  {
    id: 'heart-rate',
    category: 'foundations',
    title: 'Heart rate zones',
    line: 'What the numbers mean, and how far to trust them.',
    minutes: 6,
    scene: 'starry-valley',
    sections: [
      {
        heading: 'Maximum heart rate',
        text: 'Zones are usually set as a share of your maximum heart rate. The old "220 minus age" formula is less accurate than 208 minus 0.7 times your age (Tanaka and colleagues), but any formula can be 10 or more beats off for one person. A maximum seen in a hard race or test is better.',
      },
      {
        heading: 'Using your resting heart rate',
        text: 'The Karvonen method uses heart-rate reserve: the gap between resting and maximum. It suits people whose resting heart rate is unusually low or high. Askesis uses it when you add a resting heart rate.',
      },
      {
        heading: 'The five zones',
        text: 'Zone 1 (50-60%) very light. Zone 2 (60-70%) easy running. Zone 3 (70-80%) steady. Zone 4 (80-90%) threshold, comfortably hard. Zone 5 (90-100%) hard intervals.',
      },
      {
        heading: 'When numbers and feel disagree',
        text: 'Heart rate drifts upward in heat, when dehydrated, after poor sleep, and late in long runs. Wrist sensors can also misread. When the number and your breathing disagree, effort by feel is a fine guide.',
      },
    ],
    takeaway: 'Zones are a useful guide, not a rule. Pair them with the talk test.',
    sources: [
      'Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol. 2001;37(1):153-156.',
      'Karvonen MJ, Kentala E, Mustala O. The effects of training on heart rate; a longitudinal study. Ann Med Exp Biol Fenn. 1957;35(3):307-315.',
    ],
  },
  {
    id: 'easy',
    category: 'training',
    title: 'Why easy is most of it',
    line: 'The 80/20 pattern of endurance training.',
    minutes: 5,
    scene: 'lake-trail',
    sections: [
      {
        text: 'When researchers looked at how successful endurance athletes actually train, across running, rowing, cycling and skiing, a pattern kept appearing: about 80% of sessions at low intensity, and about 20% hard. Little time is spent in the middle.',
      },
      {
        heading: 'Why it works',
        text: 'Easy running builds the aerobic base with little strain, so you can do a lot of it and recover. That leaves energy to make the few hard sessions truly good. Running everything at a medium effort is tiring enough to need recovery, but not hard enough to bring the gains of real intervals.',
      },
      {
        heading: 'What this means in the plans',
        text: 'Every week in Askesis keeps hard running at a fifth of the total time or less. Easy runs are meant to feel easy, even slow. That is the point, not a lapse.',
      },
    ],
    takeaway: 'Keep easy days easy, so hard days can be hard.',
    sources: [
      'Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform. 2010;5(3):276-291.',
      'Stöggl T, Sperlich B. Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training. Front Physiol. 2014;5:33.',
    ],
  },
  {
    id: 'walk-run',
    category: 'training',
    title: 'Walk-run, and why it works',
    line: 'How walking breaks build up to running.',
    minutes: 4,
    scene: 'forest-trail',
    sections: [
      {
        text: 'Running asks a lot of the legs: each step lands with two to three times your body weight. Walking breaks let the heart and lungs work steadily while muscles, tendons and bones get short recoveries.',
      },
      {
        heading: 'A gradual path',
        text: 'The beginner plan starts with one minute of running and a minute and a half of walking, eight times. Over ten weeks the running grows and the walking shrinks, until 30 minutes of running feels possible. Programmes built this way, like the NHS Couch to 5K, have helped millions of people start.',
      },
      {
        heading: 'Repeating a week',
        text: 'If a week felt hard, repeating it is part of how the plan works. Bodies adapt at different speeds, and the plan waits.',
      },
    ],
    takeaway: 'Walking is not a break from the plan. It is the plan, at the start.',
    sources: [
      'NHS. Couch to 5K: week by week. nhs.uk.',
      'Nielsen RO, et al. Excessive progression in weekly running distance and risk of running-related injuries. J Orthop Sports Phys Ther. 2014;44(10):739-747.',
    ],
  },
  {
    id: 'building-up',
    category: 'training',
    title: 'Building up gradually',
    line: 'How fast to add more, and why easier weeks help.',
    minutes: 5,
    scene: 'misty-forest',
    sections: [
      {
        heading: 'The 10% rule, and what research found',
        text: 'A common guideline says to add no more than 10% a week. Studies have not shown that exact number matters, but they have found that large jumps do: new runners who increased their weekly distance by more than 30% had more injuries than those who increased it by less than 10%.',
      },
      {
        heading: 'Easier weeks',
        text: 'Training breaks the body down a little; recovery builds it back stronger. Every fourth week in the plans is about a fifth lighter, so the work of the previous weeks can settle in.',
      },
      {
        heading: 'When to hold steady',
        text: 'If a week felt hard, or life got full, repeating a week is a good choice. Askesis will offer it when your notes say "Hard" more than once, and the choice is always yours.',
      },
    ],
    takeaway: 'Small, steady increases with lighter weeks in between beat big jumps.',
    sources: [
      'Nielsen RO, et al. Excessive progression in weekly running distance and risk of running-related injuries. J Orthop Sports Phys Ther. 2014;44(10):739-747.',
      'Buist I, et al. No effect of a graded training program on the number of running-related injuries in novice runners. Am J Sports Med. 2008;36(1):33-39.',
    ],
  },
  {
    id: 'threshold',
    category: 'training',
    title: 'Threshold runs',
    line: 'Comfortably hard, and why it pays.',
    minutes: 4,
    scene: 'dusk-sky',
    sections: [
      {
        text: 'Threshold, or tempo, running is the effort you could hold for about an hour in a race: comfortably hard, a few words at a time. Training at that effort pushes the lactate threshold higher, so a faster pace becomes sustainable.',
      },
      {
        heading: 'Cruise intervals',
        text: 'Breaking threshold running into blocks with short easy jogs, such as 3 x 10 minutes, lets you do more of it at the right effort. The coach Jack Daniels called these cruise intervals. Later, the blocks join into one continuous tempo run.',
      },
      {
        heading: 'The usual mistake',
        text: 'Running them too hard. Threshold is controlled. Finishing feeling you could do one more block is right.',
      },
    ],
    takeaway: 'Comfortably hard, evenly, with a little left at the end.',
    sources: ["Daniels J. Daniels' Running Formula. 3rd ed. Human Kinetics; 2014.", 'Joyner MJ, Coyle EF. Endurance exercise performance: the physiology of champions. J Physiol. 2008;586(1):35-44.'],
  },
  {
    id: 'intervals',
    category: 'training',
    title: 'Intervals and VO2 max',
    line: 'Why 4 x 4 minutes hard works.',
    minutes: 5,
    scene: 'pink-lake',
    sections: [
      {
        text: 'VO2 max is the most oxygen your body can use in a minute. It sets the ceiling for endurance. Hard intervals raise it, because repeated efforts with recoveries let you spend more time near that ceiling than one continuous hard run could.',
      },
      {
        heading: '4 x 4 minutes',
        text: 'In a well-known study, runners who did four 4-minute intervals at 90 to 95% of maximum heart rate, with 3 minutes of easy jogging between, raised their VO2 max more than groups who trained the same total amount at a moderate or threshold effort.',
      },
      {
        heading: 'How often',
        text: 'Intervals are the hardest sessions of the week. Once a week is plenty for most people, and the plans add them only after weeks of easy running and threshold work.',
      },
    ],
    takeaway: 'Hard and controlled, with real recoveries, once a week.',
    sources: [
      'Helgerud J, et al. Aerobic high-intensity intervals improve VO2max more than moderate training. Med Sci Sports Exerc. 2007;39(4):665-671.',
      'Laursen PB, Jenkins DG. The scientific basis for high-intensity interval training. Sports Med. 2002;32(1):53-73.',
    ],
  },
  {
    id: 'long-run',
    category: 'training',
    title: 'The long run',
    line: 'Time on your feet, and how to fuel it.',
    minutes: 5,
    scene: 'forest-path',
    sections: [
      {
        text: 'The weekly long run builds endurance, trains the body to use fat for fuel, and strengthens the legs for longer distances. It is run easy: the length is the work.',
      },
      {
        heading: 'How long',
        text: 'In the plans the long run is about a third of the week. It tops out at 80 minutes for a 10K, two hours for a half marathon and three hours for a marathon: beyond that, the extra tiredness tends to outweigh the gains.',
      },
      {
        heading: 'Fuel and drink',
        text: 'For runs over about 90 minutes, sports nutrition research suggests 30 to 60 g of carbohydrate an hour, and up to 90 g in races of two and a half hours or more, from drinks, gels or food you have tried in training. Drinking to thirst suits most people.',
      },
    ],
    takeaway: 'Easy and long. Practise the fuelling you will use on race day.',
    sources: [
      'Jeukendrup A. A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Med. 2014;44(Suppl 1):S25-S33.',
      "Daniels J. Daniels' Running Formula. 3rd ed. Human Kinetics; 2014.",
    ],
  },
  {
    id: 'taper',
    category: 'training',
    title: 'Tapering before a race',
    line: 'Less running, kept sharp.',
    minutes: 4,
    scene: 'dusk-sky',
    sections: [
      {
        text: 'Fitness builds during recovery. In the last two weeks before a race (three for a marathon), the plans cut weekly time by roughly half while keeping a few short, quick efforts.',
      },
      {
        heading: 'What the research shows',
        text: 'A review of tapering studies found the best results from about two weeks of reduced training, cutting volume by 41 to 60% without lowering intensity or how often you train. Performance typically improved by a few percent.',
      },
      {
        heading: 'Feeling restless is normal',
        text: 'Many runners feel sluggish or restless in a taper. That passes. The work is done.',
      },
    ],
    takeaway: 'Run less, keep a little speed, and trust the weeks of work you have done.',
    sources: [
      'Bosquet L, et al. Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc. 2007;39(8):1358-1365.',
      'Mujika I, Padilla S. Scientific bases for precompetition tapering strategies. Med Sci Sports Exerc. 2003;35(7):1182-1187.',
    ],
  },
  {
    id: 'form',
    category: 'training',
    title: 'Running form basics',
    line: 'A few cues, no overhaul.',
    minutes: 4,
    scene: 'lake-trail',
    sections: [
      {
        text: 'There is no single correct way to run, and big changes to your natural stride can cause trouble of their own. A few simple cues help most people.',
      },
      {
        heading: 'Cues worth trying',
        text: 'Run tall, relaxed shoulders, hands loose. Let your foot land close to under your body rather than far in front. Slightly quicker, shorter steps: in a study, raising step rate by 5 to 10% reduced the load on the knees and hips.',
      },
      {
        heading: 'Strides help',
        text: 'The short strides in the plans are a gentle way to practise quick, relaxed running form.',
      },
    ],
    takeaway: 'Tall, relaxed, quick light steps. Small changes, over weeks.',
    sources: ['Heiderscheit BC, et al. Effects of step rate manipulation on joint mechanics during running. Med Sci Sports Exerc. 2011;43(2):296-302.'],
  },
  {
    id: 'rest',
    category: 'health',
    title: 'Rest is part of training',
    line: 'Sleep, easy days, and listening to tiredness.',
    minutes: 4,
    scene: 'starry-valley',
    sections: [
      {
        text: 'Training is a stress; the body grows stronger while it recovers. Without enough recovery, tiredness can pile up into weeks of feeling flat.',
      },
      {
        heading: 'Signs to rest',
        text: 'Unusual tiredness that lasts, poor sleep, a resting heart rate noticeably higher than normal, heavy legs on easy runs, or losing interest. Experts on overtraining note that these early signs usually clear with a few easy days.',
      },
      {
        heading: 'Sleep',
        text: 'Adults generally need 7 or more hours a night. Sleep is when much of the repair happens.',
      },
    ],
    takeaway: 'An easy day or a day off is part of the plan, never a step away from it.',
    sources: [
      'Meeusen R, et al. Prevention, diagnosis, and treatment of the overtraining syndrome. Med Sci Sports Exerc. 2013;45(1):186-205.',
      'Watson NF, et al. Recommended amount of sleep for a healthy adult. Sleep. 2015;38(6):843-844.',
    ],
  },
  {
    id: 'shifts',
    category: 'health',
    title: 'Training around shifts',
    line: 'Nights, early starts, and changing schedules.',
    minutes: 4,
    scene: 'cloud-sky',
    sections: [
      {
        text: 'Shift work, especially nights, cuts into sleep and shifts the body clock. Hard sessions after a night of work feel harder and recover slower.',
      },
      {
        heading: 'Fitting the plan to your schedule',
        text: 'If you use Proairetos on this phone, Askesis reads your schedule and marks sessions that fall the day after a night. You can move them, keep them easy, or let them pass. Hard sessions fit best on rested days.',
      },
      {
        heading: 'Sleep first',
        text: 'After nights, sleep comes before training. A short easy run or walk can feel good on a changeover day; a hard one usually does not.',
      },
    ],
    takeaway: 'Put the hard sessions on rested days. Nothing needs catching up.',
    sources: ['Watson NF, et al. Recommended amount of sleep for a healthy adult. Sleep. 2015;38(6):843-844.'],
  },
  {
    id: 'before-you-start',
    category: 'health',
    title: 'Before you start',
    line: 'When to check with a doctor, and when to stop.',
    minutes: 3,
    scene: 'misty-lake',
    sections: [
      {
        heading: 'Check with a doctor first if',
        text: 'You have a heart condition or high blood pressure, you have had chest pain at rest or when active, you lose balance from dizziness or have fainted, you have a long-term condition or take medicine for one, or you are pregnant. This follows the PAR-Q+ questionnaire used to screen for exercise.',
      },
      {
        heading: 'Stop and seek help if',
        text: 'You feel chest pain or pressure, unusual shortness of breath, a racing or irregular heartbeat, or faintness. In an emergency, call your local emergency number.',
      },
      {
        heading: 'Aches',
        text: 'Mild muscle soreness a day or two after running is normal. Sharp pain, pain that changes how you run, or pain that worsens over several runs is worth resting and getting checked.',
      },
    ],
    takeaway: 'Most people can start walking and running safely. A quick check first, if any of these apply.',
    sources: [
      'Warburton DER, et al. The Physical Activity Readiness Questionnaire for Everyone (PAR-Q+). Health Fit J Can. 2011;4(2):3-23.',
    ],
  },
];

export function article(id: string): Article | undefined {
  return articles.find((item) => item.id === id);
}
