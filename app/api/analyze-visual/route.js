import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const ANALYZE_PROMPT = `You are analyzing a math visual model from a K-5 assessment worksheet.

Look at this image carefully and identify what type of math visual it shows.
Then output ONLY the exact marker string needed to recreate it in our rendering system.

MARKER TYPES — choose the best match:

[ARRAY: rows=R cols=C]
  A rectangular grid of individual dots. Count the rows (horizontal) and columns (vertical).
  Example: 3 rows of 5 dots → [ARRAY: rows=3 cols=5]

[NUM_LINE: min=0 max=M step=S]
  A horizontal number line with tick marks and labels.
  Identify start, end, and interval between labeled marks.
  Example: 0 to 30, labeled every 5 → [NUM_LINE: min=0 max=30 step=5]
  If it shows hop arcs (jumps drawn above the line): [NUM_LINE: min=0 max=30 step=5 jumps=yes]

[GROUPS: groups=G items=I]
  Equal groups of objects drawn as ovals or circles, each containing dots or objects.
  Count the groups and the items inside each group.
  Example: 4 circles each with 3 dots → [GROUPS: groups=4 items=3]

[TENS_FRAME: filled=F total=10]
  A 2×5 or 1×5 grid (frame) with some cells filled (counters) and some empty.
  Count filled cells and total cells. total is usually 10 (tens frame) or 5 (five frame).
  Example: 7 filled in a 10-frame → [TENS_FRAME: filled=7 total=10]

[NUM_BOND: whole=W part1=P1 part2=P2]
  A number bond diagram: a circle at top (whole) connected to two circles below (parts).
  Read the numbers shown. If a number is blank/missing use 0.
  Example: 12 on top, 5 and 7 → [NUM_BOND: whole=12 part1=5 part2=7]

[FRACTION: N/D]
  A rectangular bar divided into equal sections, some shaded.
  Count total sections (denominator) and shaded sections (numerator).
  Example: bar split in 4, 3 shaded → [FRACTION: 3/4]

[FRAC_CIRCLE: N/D]
  A circle divided into equal sectors, some shaded (like a pie).
  Count total sectors and shaded sectors.
  Example: circle split in 8, 5 shaded → [FRAC_CIRCLE: 5/8]

[AREA_MODEL: collabels=20,3 | rowlabels=4]
  A filled rectangle divided into sections showing partial products (box method).
  Read the column labels (top) and row labels (left side).
  Example: top shows 20 and 3, left shows 4 → [AREA_MODEL: collabels=20,3 | rowlabels=4]

[BAR_MODEL: v1,v2,v3 | label=Total]
  A horizontal bar split into labeled segments (tape diagram / bar model).
  List the segment values separated by commas.
  Example: bar with parts 4, 6 labeled Total=10 → [BAR_MODEL: 4,6 | label=Total is 10]

[FUNC_TABLE: pairs=1:6,2:12,3:18,4:? | rule=×6]
  An input/output table (function table). List input:output pairs separated by commas.
  Unknown values use ?. Include the rule if shown.
  Example: → [FUNC_TABLE: pairs=2:6,4:12,6:18,8:? | rule=×3]

[NUM_CHART: start=1 end=100 cols=10 shaded=3,6,9,12]
  A grid of consecutive numbers (like a hundreds chart) with some cells highlighted/shaded.
  Identify the range, how many columns per row, and which numbers are shaded.
  Example: 1-40 grid with 3,9,15,21,27,33,39 shaded → [NUM_CHART: start=1 end=40 cols=10 shaded=3,9,15,21,27,33,39]

[PV_CHART: 342]
  A place value chart showing hundreds, tens, ones columns with tally marks or digits.
  Read the number represented.
  Example: → [PV_CHART: 342]

[BASE10: hundreds=1 tens=3 ones=4]
  Base-10 block drawings: large squares (hundreds), rods (tens), small cubes (ones).
  Count each type. Example: 1 flat, 3 rods, 4 units → [BASE10: hundreds=1 tens=3 ones=4]

[DATA_TABLE: header=Col1,Col2 | Row1val1,Row1val2 | Row2val1,Row2val2]
  Any data table, tally chart, frequency table, or survey results table.
  The header= entry lists the column header names separated by commas.
  Each subsequent pipe-delimited segment is one data row, values separated by commas.
  Example (insect table): → [DATA_TABLE: header=Insect Group,Number | Beetles,6 | Butterflies,6 | Ants,6 | Bees,6 | Dragonflies,6]
  Example (tally chart): → [DATA_TABLE: header=Color,Tally,Total | Red,||||,4 | Blue,|||,3]

[YES_NO_TABLE: equation1 | equation2 | equation3]
  A Yes/No or True/False decision table where each row shows an equation or statement
  and the student circles/bubbles Yes or No (or True/False) for each.
  List each row's equation or statement separated by pipes.
  Example: → [YES_NO_TABLE: 42 ÷ __ = 7 | __ × 9 = 54 | 36 ÷ 6 = __ | 6 × __ = 30]

[GRID_RESPONSE: cols=4]
  A student answer grid: boxes across the top for writing digits, with 0–9 bubbles
  in columns below (standard gridded-response format on standardized tests).
  Count the number of digit columns. Example: → [GRID_RESPONSE: cols=4]

OUTPUT RULES:
- Output ONLY the marker string on a single line. Nothing else. No explanation. No punctuation before or after.
- If the image shows two separate groups that together form a model (like Maya's plates showing 5 groups + 3 groups), output both markers on separate lines:
  [GROUPS: groups=5 items=7]
  [GROUPS: groups=3 items=7]
- If the visual does not match any type above (e.g. a bar graph, pictograph, geometric figure,
  coordinate plane, clock face, or other graphic), output exactly: UNKNOWN
- Do NOT include any text besides the marker(s) or UNKNOWN.`;

export async function POST(request) {
  try {
    const { imageData, mediaType, apiKey } = await request.json();

    if (!apiKey) {
      return Response.json({ error: 'API key required.' }, { status: 400 });
    }
    if (!imageData) {
      return Response.json({ error: 'No image data provided.' }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });

    // imageData may be a full data URL ("data:image/png;base64,....") or raw base64
    let base64Data = imageData;
    let detectedType = mediaType || 'image/png';

    if (imageData.startsWith('data:')) {
      const [header, data] = imageData.split(',');
      base64Data = data;
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) detectedType = mimeMatch[1];
    }

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: detectedType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: ANALYZE_PROMPT,
            },
          ],
        },
      ],
    });

    const raw = response.content[0]?.text?.trim() || 'UNKNOWN';

    if (raw === 'UNKNOWN') {
      return Response.json({ marker: null, message: 'Could not identify a known visual type in this image.' });
    }

    // Validate that all returned lines look like markers
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const markerPattern = /^\[[A-Z][A-Z0-9_]*:.+\]$/;
    const validMarkers = lines.filter(l => markerPattern.test(l));

    if (validMarkers.length === 0) {
      return Response.json({ marker: null, message: 'Could not identify a known visual type in this image.' });
    }

    return Response.json({ markers: validMarkers });
  } catch (err) {
    console.error('analyze-visual error:', err);
    return Response.json({ error: err.message || 'Analysis failed.' }, { status: 500 });
  }
}
