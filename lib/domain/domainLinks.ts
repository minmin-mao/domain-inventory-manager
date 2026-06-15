const ACCOUNT_REFERENCE_BASE_URL =
  "https://docs.google.com/spreadsheets/d/1GP0IaUi53N0aKAkIXYY_Lp1XGe5fKOkYs--8f8ONwEg/edit?gid=1915196180#gid=1915196180";

const normalizeLinkKey = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const HOSTING_LOGIN_URLS: Record<string, string> = {
  aheadhost: "https://www.aheadhostllc.com/clients/login",
  gname: "https://www.gname.com/login",
  namecheap: "https://www.namecheap.com/myaccount/login/",
  ultahost: "https://bill.ultahost.com/login",
  virtualine: "https://client.virtualine.net/login",
  orange: "https://secure.orangewebsite.com/login",
};

const ACCOUNT_REFERENCE_RANGES: Record<string, string> = {
  "namecheap:azfara": "AG10",
  "orange:azfara": "I10",
  "virtualine:cindy": "C4",
  "ultahost:cindy": "M4",
  "aheadhost:cindy": "K6",
  "namecheap:cindy": "AG6",
  "orange:cindy": "I8",
  "gname:palan": "U4",
  "namecheap:palan": "AG4",
  "ultahost:palan": "M6",
  "aheadhost:palan": "K10",
  "orange:palan": "I14",
  "virtualine:stnly": "C6",
  "gname:stnly": "U6",
  "aheadhost:stnly": "K8",
  "ultahost:stnly": "M10",
  "orange:stnly": "I12",
  "orange:vtan": "I4",
  "aheadhost:vtan": "K4",
  "virtualine:vtan": "C8",
  "ultahost:vtan": "M8",
};

export function getHostingLoginUrl(hosting: string | null | undefined) {
  return HOSTING_LOGIN_URLS[normalizeLinkKey(hosting)] ?? null;
}

export function getAccountReferenceUrl(
  hosting: string | null | undefined,
  account: string | null | undefined
) {
  const range = ACCOUNT_REFERENCE_RANGES[
    `${normalizeLinkKey(hosting)}:${normalizeLinkKey(account)}`
  ];

  return range ? `${ACCOUNT_REFERENCE_BASE_URL}&range=${range}` : null;
}

