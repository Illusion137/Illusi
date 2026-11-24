//
//  ShareViewController.swift
//  IllusiShare
//
//  Created by Daniel Raygoza on 11/17/25.
//

import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    private var handled = false

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !handled else { return }
        handled = true
        Task { await handleShared() }
    }

    @MainActor
    private func handleShared() async {
        guard let shared = await sharedURL(),
            let schemeURL = illusiURL(for: shared)
        else {
            completeRequest()
            return
        }
        openURL(schemeURL)
    }

    /// The first web link among the shared items: apps share it either as a URL or as text containing one.
    private func sharedURL() async -> URL? {
        let providers = (extensionContext?.inputItems as? [NSExtensionItem] ?? []).flatMap { $0.attachments ?? [] }

        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
            if let url = try? await provider.loadItem(forTypeIdentifier: UTType.url.identifier) as? URL,
                url.scheme?.hasPrefix("http") == true
            {
                return url
            }
        }
        for provider in providers where provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
            if let text = try? await provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) as? String,
                let url = firstLink(in: text)
            {
                return url
            }
        }
        return nil
    }

    private func firstLink(in text: String) -> URL? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let range = NSRange(text.startIndex..., in: text)
        return detector?.matches(in: text, range: range)
            .compactMap(\.url)
            .first { $0.scheme?.hasPrefix("http") == true }
    }

    private func illusiURL(for shared: URL) -> URL? {
        var unreserved = CharacterSet.alphanumerics
        unreserved.insert(charactersIn: "-._~")
        guard let encoded = shared.absoluteString.addingPercentEncoding(withAllowedCharacters: unreserved) else {
            return nil
        }
        return URL(string: "illusi://actions/view?url=\(encoded)")
    }

    private func completeRequest() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }

    /// Extensions can't reach `UIApplication.shared`, so find the app through the responder chain.
    @MainActor
    private func openURL(_ url: URL) {
        var responder: UIResponder? = self
        while let current = responder {
            if let application = current as? UIApplication {
                application.open(url, options: [:]) { [weak self] _ in
                    self?.completeRequest()
                }
                return
            }
            responder = current.next
        }
        completeRequest()
    }
}
