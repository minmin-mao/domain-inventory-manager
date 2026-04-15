import Button from "@/components/Button";
import SmartDropdown from "@/components/SmartDropdown";
import { getDaysLeft } from "@/lib/domain/domainUtils";
import { getSuggestionLanguageLabel } from "@/lib/domain/languageUtils";
import { capitalizeText } from "@/lib/domain/textUtils";
import type { DomainItem } from "@/lib/domain/domainTypes";

type Props = {
  item: DomainItem;
  index: number;
  highlightDomainId: string | null;
  editingId: string | null;
  editDomain: DomainItem | null;

  hostingOptions: string[];
  accountOptions: string[];
  projectOptions: string[];
  countryOptions: string[];
  languageOptions: string[];

  setHostingOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setAccountOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setProjectOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setCountryOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setLanguageOptions: React.Dispatch<React.SetStateAction<string[]>>;
  setEditDomain: React.Dispatch<React.SetStateAction<DomainItem | null>>;

  handleEdit: (item: DomainItem) => void;
  handleSave: () => void;
  handleDeleteDomain: (id: string) => void;
  handleReserveDomain?: (item: DomainItem) => void;
  setEditingId: (id: string | null) => void;
};

export default function DomainRow(props: Props) {
  const {
    item,
    index,
    highlightDomainId,
    editingId,
    editDomain,
    hostingOptions,
    accountOptions,
    projectOptions,
    countryOptions,
    languageOptions,
    setHostingOptions,
    setAccountOptions,
    setProjectOptions,
    setCountryOptions,
    setLanguageOptions,
    setEditDomain,
    handleEdit,
    handleSave,
    handleDeleteDomain,
    handleReserveDomain,
    setEditingId
  } = props;

  const daysLeft = getDaysLeft(item.expiry ?? undefined);

  let expiryLabel: string | null = null;
  let expiryColor = "";

  if (daysLeft !== null) {
    if (daysLeft < 0) {
      expiryLabel = "Expired";
      expiryColor = "text-red-600";
    } else if (daysLeft <= 30) {
      expiryLabel = "⚠ Expiring soon";
      expiryColor = "text-red-500";
    } else if (daysLeft <= 60) {
      expiryLabel = "Expiring soon";
      expiryColor = "text-yellow-500";
    }
  }

  const rowColor =
    highlightDomainId === item.id
      ? "bg-blue-500/10"
      : daysLeft !== null && daysLeft < 0
      ? "bg-red-600/10"
      : daysLeft !== null && daysLeft <= 30
      ? "bg-red-500/10"
      : daysLeft !== null && daysLeft <= 60
      ? "bg-yellow-500/10"
      : "hover:bg-zinc-800/40";

  return (
    <tr id={`domain-${item.id}`} className={`transition ${rowColor}`}>
      {/* Index */}
      <td className="px-4 py-3">{index + 1}</td>

      {/* Domain */}
      <td className="px-4 py-3 font-medium">
        {editingId === item.id ? (
          <input
            type="text"
            className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1"
            value={editDomain?.domain || ""}
            onChange={(e) =>
              setEditDomain((prev) =>
                prev ? { ...prev, domain: e.target.value.toLowerCase() } : prev
              )
            }
          />
        ) : (
          item.domain
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400">
          {item.status}
        </span>
      </td>

      {/* Hosting */}
      <td className="px-4 py-3">
        {editingId === item.id ? (
          <SmartDropdown
            value={editDomain?.hosting || ""}
            setValue={(v) =>
              setEditDomain((prev) =>
                prev ? { ...prev, hosting: capitalizeText(v) } : prev
              )
            }
            options={hostingOptions}
            setOptions={setHostingOptions}
            placeholder="Hosting"
          />
        ) : (
          item.hosting
        )}
      </td>

      {/* Account */}
      <td className="px-4 py-3">
        {editingId === item.id ? (
          <SmartDropdown
            value={editDomain?.account || ""}
            setValue={(v) =>
              setEditDomain((prev) =>
                prev ? { ...prev, account: capitalizeText(v) } : prev
              )
            }
            options={accountOptions}
            setOptions={setAccountOptions}
            placeholder="Account"
          />
        ) : (
          item.account
        )}
      </td>

      {/* Project */}
      <td className="px-4 py-3">
        {editingId === item.id ? (
          <SmartDropdown
            value={editDomain?.project || ""}
            setValue={(v) =>
              setEditDomain(prev =>
                prev ? { ...prev, project: capitalizeText(v) } : prev
              )
            }
            options={projectOptions}
            setOptions={setProjectOptions}
            placeholder="Project"
          />
        ) : (
          item.project
        )}
      </td>

      {/* Country */}
      <td className="px-4 py-3">
        {editingId === item.id ? (
          <SmartDropdown
            value={editDomain?.country || ""}
            setValue={(v) =>
              setEditDomain(prev =>
                prev ? { ...prev, country: capitalizeText(v) } : prev
              )
            }
            options={countryOptions}
            setOptions={setCountryOptions}
            placeholder="Country"
          />
        ) : (
          item.country
        )}
      </td>

      <td className="px-4 py-3">
        {editingId === item.id ? (
          <SmartDropdown
            value={editDomain?.language || ""}
            setValue={(v) =>
              setEditDomain((prev) =>
                prev ? { ...prev, language: v.trim().toUpperCase() } : prev
              )
            }
            options={languageOptions}
            setOptions={setLanguageOptions}
            placeholder="Language"
          />
        ) : (
          getSuggestionLanguageLabel(item.language, item.country)
        )}
      </td>

      {/* Expiry Date */}
      <td className="px-4 py-3">
        {editingId === item.id ? (
          <input
            type="text"
            className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded"
            value={editDomain?.expiry || ""}
            placeholder="YYYY-MM-DD"
            onChange={(e) =>
              setEditDomain(prev =>
                prev ? { ...prev, expiry: e.target.value } : prev
              )
            }
          />
        ) : (
          item.expiry
            ? new Date(item.expiry).toISOString().split("T")[0]
            : "-"
        )}
      </td>

      {/* Days Left */}
      <td className="px-4 py-3">
        {daysLeft !== null ? (
          <>
            <span className={daysLeft <= 30 ? "text-red-500" : ""}>
              {daysLeft} days{" "}
            </span>

            {expiryLabel && (
              <span className={`ml-2 text-xs ${expiryColor}`}>
                {expiryLabel}
              </span>
            )}
          </>
        ) : (
          "-"
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex min-w-[270px] justify-end gap-2">
          {editingId === item.id ? (
            <>
              <Button onClick={handleSave}>Save</Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setEditDomain(null);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {handleReserveDomain ? (
                <Button
                  variant="secondary"
                  onClick={() => handleReserveDomain(item)}
                >
                  Reserve
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => handleEdit(item)}
              >
                Edit
              </Button>

              <Button
                variant="secondary"
                onClick={() => handleDeleteDomain(item.id)}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
