# TypeError: Failed to resolve SABR URL | Network request failed

**Issue ID:** 7359296985 **Project:** illusi **Date:** 3/25/2026, 4:49:03 PM

## Issue Summary

TypeError: Failed to resolve SABR URL during network request **What's wrong:** Encountered a **TypeError** specifically failing to resolve the **SABR URL** for video **eF9BAOdzfUc**. **In the trace:** Connectivity logs show a **transient switch** from Wi-Fi to cellular connection just prior to the error. **Possible cause:** The **Network request failed** likely stems from an issue during the **SABR URL resolution** phase, possibly due to the network state change or an expired/invalid token in the preceding **player API POST** request.

## Tags

-   **app.device:** 02079595e3e85eb3da94bfa7680c24be2654991a
-   **device:** iPhone17,1
-   **device.class:** high
-   **device.family:** iOS
-   **dist:** 1
-   **environment:** production
-   **event.environment:** javascript
-   **event.origin:** javascript
-   **handled:** yes
-   **hermes:** True
-   **level:** error
-   **mechanism:** generic
-   **os:** iOS 26.3
-   **os.build:** 23D127
-   **os.name:** iOS
-   **os.rooted:** no
-   **release:** com.illusion137.Illusi@19.0.1+1
-   **user:** id:FD93F8D0-81D0-408C-AF44-451BF7662E0F

## Exception

### Exception 1

**Type:** TypeError **Value:** Failed to resolve SABR URL | Network request failed : args{ video_id: "aLtEAOr2M_U" }
