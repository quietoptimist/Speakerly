export const STOP_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
  'who', 'whom', 'this', 'that', 'these', 'those',
  // Prepositions
  'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up', 'as', 'into', 'from', 'with',
  'about', 'above', 'after', 'against', 'along', 'among', 'around', 'before', 'behind',
  'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'except', 'inside',
  'near', 'off', 'out', 'outside', 'over', 'past', 'since', 'through', 'throughout',
  'under', 'until', 'upon', 'within', 'without',
  // Conjunctions
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'not', 'only',
  'whether', 'although', 'because', 'if', 'since', 'though', 'unless', 'until', 'while',
  'after', 'before', 'when', 'where', 'whereas', 'wherever',
  // Auxiliary verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may',
  'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  // Common verbs (very generic)
  'get', 'got', 'gotten', 'go', 'goes', 'went', 'gone', 'going', 'come', 'came',
  'coming', 'say', 'said', 'says', 'saying', 'make', 'made', 'making', 'know', 'knew',
  'known', 'think', 'thought', 'thinking', 'take', 'took', 'taken', 'taking', 'see',
  'saw', 'seen', 'seeing', 'look', 'looked', 'looking', 'want', 'wanted', 'wanting',
  'give', 'gave', 'given', 'giving', 'use', 'used', 'using', 'find', 'found', 'finding',
  'tell', 'told', 'telling', 'ask', 'asked', 'asking', 'seem', 'seemed', 'seeming',
  'feel', 'felt', 'feeling', 'try', 'tried', 'trying', 'leave', 'left', 'leaving',
  'keep', 'kept', 'keeping', 'put', 'putting', 'let', 'letting', 'begin', 'began',
  'begun', 'show', 'showed', 'shown', 'hear', 'heard', 'hearing', 'play', 'played',
  'run', 'ran', 'running', 'move', 'moved', 'moving', 'live', 'lived', 'living',
  'bring', 'brought', 'bringing', 'turn', 'turned', 'turning', 'start', 'started',
  // Determiners / quantifiers
  'all', 'any', 'each', 'every', 'few', 'more', 'most', 'much', 'no', 'one', 'other',
  'same', 'some', 'such', 'than', 'too', 'very', 'just', 'own', 'two', 'three', 'four',
  'five', 'six', 'seven', 'eight', 'nine', 'ten', 'many', 'several', 'half',
  // Adverbs
  'also', 'back', 'even', 'here', 'how', 'however', 'now', 'still', 'then', 'there',
  'therefore', 'though', 'thus', 'well', 'why', 'already', 'again', 'away', 'else',
  'ever', 'far', 'further', 'hence', 'later', 'maybe', 'never', 'often', 'once',
  'quite', 'rather', 'really', 'soon', 'somehow', 'sometimes', 'somewhere', 'still',
  'today', 'together', 'tomorrow', 'usually', 'very', 'yesterday',
  // Common short conversational responses
  'yes', 'no', 'ok', 'okay', 'sure', 'fine', 'good', 'great', 'nice', 'right',
  'thanks', 'thank', 'please', 'sorry', 'hello', 'bye', 'goodbye', 'hi', 'hey',
  'oh', 'ah', 'wow', 'hmm', 'um', 'uh',
  // Single/double chars (caught by length filter too, but explicit here)
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'id', 'ie',
]);
