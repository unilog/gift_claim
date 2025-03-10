import React, { useState, useEffect } from "react";
import crypto from "crypto";
import { initialFids } from "./fidsConfig";

interface ResponseData {
  code: number;
  data?: {
    nickname: string;
    avatar_image: string;
  };
  msg: string;
  err_code?: number;
}

const GiftCodeRequest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Array<{ fid: string; nickname: string; avatar_image: string; msg?: string }>
  >([]);
  const [inputFids, setInputFids] = useState(
    Array.isArray(initialFids) ? initialFids.join(",") : ""
  );
  const [giftCode, setGiftCode] = useState("WOSRamadan25");

  const generateSign = (params: string) => {
    const salt = "tB87#kPtkxqOS2";
    return crypto
      .createHash("md5")
      .update(params + salt)
      .digest("hex");
  };

  const fetchWithRetries = async (url: string, body: URLSearchParams) => {
    const maxRetries = 5;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });

        if (response.status === 429) {
          const waitTime = Math.pow(2, retries) * 1000;
          console.warn(
            `Rate limited. Retrying in ${waitTime / 1000} seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
      } catch (err) {
        if (retries >= maxRetries) {
          throw err;
        }
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  const handleGiftCodeRedemption = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    const time = "1740009593611";
    const fids = inputFids.split(",").map((fid) => fid.trim());

    try {
      for (const fid of fids) {
        const sign = generateSign(`fid=${fid}&time=${time}`);
        const body = new URLSearchParams({ sign, fid, time });
        const result: ResponseData = await fetchWithRetries(
          "https://wos-giftcode-api.centurygame.com/api/player",
          body
        );

        if (result.code === 0 && result.data) {
          const newEntry = {
            fid,
            nickname: result.data.nickname,
            avatar_image: result.data.avatar_image,
            msg: "",
          };

          setResults((prev) => [...prev, newEntry]);

          const giftSign = generateSign(
            `cdk=${giftCode}&fid=${fid}&time=${time}`
          );
          const giftBody = new URLSearchParams({
            sign: giftSign,
            cdk: giftCode,
            fid,
            time,
          });

          const giftResult: ResponseData = await fetchWithRetries(
            "https://wos-giftcode-api.centurygame.com/api/gift_code",
            giftBody
          );

          setResults((prev) =>
            prev.map((item) =>
              item.fid === fid ? { ...item, msg: giftResult.msg } : item
            )
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerData = async () => {
    const time = "1740009593611";
    const fids = inputFids.split(",").map((fid) => fid.trim());
    try {
      for (const fid of fids) {
        const sign = generateSign(`fid=${fid}&time=${time}`);
        const body = new URLSearchParams({ sign, fid, time });
        const result: ResponseData = await fetchWithRetries(
          "https://wos-giftcode-api.centurygame.com/api/player",
          body
        );
        if (result.code === 0 && result.data) {
          setResults((prev) => [
            ...prev,
            {
              fid,
              nickname: result.data.nickname,
              avatar_image: result.data.avatar_image,
              msg: "",
            },
          ]);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    }
  };

  const handleGiftCodeRedemptionStep2 = async () => {
    setLoading(true);
    setError(null);
    const time = "1740113893028";
    if (!giftCode.trim()) return;
    try {
      for (const entry of results) {
        const sign = generateSign(
          `cdk=${giftCode}&fid=${entry.fid}&time=${time}`
        );
        const body = new URLSearchParams({
          sign,
          cdk: giftCode,
          fid: entry.fid,
          time,
        });
        const result: ResponseData = await fetchWithRetries(
          "https://wos-giftcode-api.centurygame.com/api/gift_code",
          body
        );
        setResults((prev) =>
          prev.map((item) =>
            item.fid === entry.fid ? { ...item, msg: result.msg } : item
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h2>Gift Code FOR 859-SUN, auto claim</h2>
      <textarea
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
        placeholder="Enter FIDs, separated by commas"
        value={inputFids}
        onChange={(e) => setInputFids(e.target.value)}
        rows={2}
      />
      <input
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "20px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
        placeholder="Enter Gift Code"
        value={giftCode}
        onChange={(e) => setGiftCode(e.target.value)}
      />
      <button
        style={{
          padding: "10px 20px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "20px",
        }}
        onClick={handleGiftCodeRedemption}
        disabled={loading}
      >
        {loading ? "Loading..." : "Redeem Gift Code"}
      </button>
      {results.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                FID
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                Nickname
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                Avatar
              </th>
              <th
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                Message
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={index}>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {result.fid}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {result.nickname}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  <img
                    src={result.avatar_image}
                    alt={`Avatar of ${result.nickname}`}
                    style={{ width: "50px", height: "50px", borderRadius: "0" }}
                  />
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {result.msg || ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <footer
        style={{
          marginTop: "20px",
          textAlign: "center",
          fontSize: "14px",
          color: "#666",
        }}
      >
        powered by FixGo.com |{" "}
        <a
          href="https://xj2hsp.csb.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          SUN BEAR TRAP Wargaming Simulation
        </a>
      </footer>
    </div>
  );
};

export default GiftCodeRequest;
