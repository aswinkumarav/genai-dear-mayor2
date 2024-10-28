import { AskResponse, Citation } from "../../api";
import { cloneDeep } from "lodash-es";


type ParsedAnswer = {
    citations: Citation[];
    markdownFormatText: string;
};

const enumerateCitations = (citations: Citation[]) => {
    const filepathMap = new Map();
    for (const citation of citations) {
        const { filepath } = citation;
        let part_i = 1
        if (filepathMap.has(filepath)) {
            part_i = filepathMap.get(filepath) + 1;
        }
        filepathMap.set(filepath, part_i);
        citation.part_index = part_i;
    }
    return citations;
}

export function parseAnswer(answer: AskResponse): ParsedAnswer {
    let answerText = answer.answer;
    const citationLinks = answerText.match(/\[(doc\d\d?\d?)]/g);

    const lengthDocN = "[doc".length;

    let filteredCitations = [] as Citation[];
    let citationReindex = 0;
    citationLinks?.forEach(link => {
        // Replacing the links/citations with number
        let citationIndex = link.slice(lengthDocN, link.length - 1);
        let citation = cloneDeep(answer.citations[Number(citationIndex) - 1]) as Citation;
        if (!filteredCitations.find((c) => c.id === citationIndex) && citation) {
          answerText = answerText.replaceAll(link, ` ^${++citationReindex}^ `);
          citation.id = citationIndex; // original doc index to de-dupe
          citation.reindex_id = citationReindex.toString(); // reindex from 1 for display
          filteredCitations.push(citation);
        }
    })

    filteredCitations = enumerateCitations(filteredCitations);

    return {
        citations: filteredCitations,
        markdownFormatText: "The retrieved documents do not provide a specific count of city officials. However, they do list various categories of officials and entities that are considered part of the City and County of San Francisco's governance structure. These include:\n\n1. Officers elected by vote of the people.\n2. Members of the Board of Education.\n3. Members of boards and commissions appointed by the Mayor and the Board of Supervisors.\n4.Members of specific commissions such as the Building Inspection Commission, Ethics Commission, Elections Commission, Retirement Board, Health Service Board, Retiree Health Care Trust Fund Board, Sunshine Ordinance Task Force, Youth Commission, Small Business Commission, and Board of Law Library Trustees.\n5. The Superintendent of Schools.\n 6. The executive appointed as the chief executive officer under each board or commission.\n 7.The Controller.\n8. The City Administrator.\n9.The head of each department under the Mayor.\n10. Other officers as may be provided by law or designated by ordinance [doc1].\n\nFor a precise count, one would need to tally the individuals in each of these categories, which is not provided in the documents."
    };
}
