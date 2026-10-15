/** One author as named on a paper. Ids are OpenAlex author ids, such as "A5023888391". */
export interface Credit {
  id: string;
  name: string;
  orcid: string | null;
  countries: string[];
}

export interface Work {
  id: string;
  title: string;
  year: number;
  citations: number;
  authors: Credit[];
}

export interface AuthorSummary {
  id: string;
  name: string;
  orcid: string | null;
  worksCount: number;
  citations: number;
  institution: string | null;
}
