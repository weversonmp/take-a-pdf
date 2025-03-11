document.addEventListener("DOMContentLoaded", () => {
  const selectButton = document.getElementById("selectElement")
  const statusDiv = document.getElementById("status")

  selectButton.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    // First, inject the html2pdf library
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["html2pdf.bundle.min.js"],
    })

    // Then inject selector script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: enableElementSelection,
    })

    statusDiv.textContent = "Select an element on the page..."
    window.close()
  })
})

// This function will be injected into the page
function enableElementSelection() {
  // Create a message element
  const messageEl = document.createElement("div")
  messageEl.id = "pdf-selector-message"
  messageEl.textContent = "Click on an element to convert it to PDF"
  messageEl.style.position = "fixed"
  messageEl.style.top = "0"
  messageEl.style.left = "0"
  messageEl.style.right = "0"
  messageEl.style.backgroundColor = "#4285f4"
  messageEl.style.color = "white"
  messageEl.style.padding = "10px"
  messageEl.style.zIndex = "9999"
  messageEl.style.textAlign = "center"
  document.body.appendChild(messageEl)

  // Track the currently hovered element
  let currentElement = null
  let highlightElement = null

  // Create highlight overlay
  function createHighlight() {
    highlightElement = document.createElement("div")
    highlightElement.id = "pdf-element-highlight"
    highlightElement.style.position = "absolute"
    highlightElement.style.border = "2px solid #4285f4"
    highlightElement.style.backgroundColor = "rgba(66, 133, 244, 0.1)"
    highlightElement.style.zIndex = "9998"
    highlightElement.style.pointerEvents = "none"
    document.body.appendChild(highlightElement)
  }

  createHighlight()

  // Update highlight position
  function updateHighlight(element) {
    if (!element || !highlightElement) return

    const rect = element.getBoundingClientRect()
    highlightElement.style.top = `${rect.top + window.scrollY}px`
    highlightElement.style.left = `${rect.left + window.scrollX}px`
    highlightElement.style.width = `${rect.width}px`
    highlightElement.style.height = `${rect.height}px`
  }

  // Mouse over handler
  function handleMouseOver(e) {
    e.stopPropagation()
    currentElement = e.target
    updateHighlight(currentElement)
  }

  // Click handler
  function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    if (!currentElement) return

    // Clean up event listeners
    document.removeEventListener("mouseover", handleMouseOver, true)
    document.removeEventListener("click", handleClick, true)

    // Remove highlight and message
    if (highlightElement) highlightElement.remove()
    if (messageEl) messageEl.remove()

    // Generate PDF from the selected element
    generatePDF(currentElement)
  }

  // Add event listeners
  document.addEventListener("mouseover", handleMouseOver, true)
  document.addEventListener("click", handleClick, true)

  // Function to generate PDF
  function generatePDF(element) {
    // Show processing message
    const processingMsg = document.createElement("div")
    processingMsg.id = "pdf-processing-message"
    processingMsg.textContent = "Generating PDF..."
    processingMsg.style.position = "fixed"
    processingMsg.style.top = "0"
    processingMsg.style.left = "0"
    processingMsg.style.right = "0"
    processingMsg.style.backgroundColor = "#4285f4"
    processingMsg.style.color = "white"
    processingMsg.style.padding = "10px"
    processingMsg.style.zIndex = "9999"
    processingMsg.style.textAlign = "center"
    document.body.appendChild(processingMsg)

    // Use html2pdf to generate PDF
    const opt = {
      margin: 10,
      filename: "element.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 3 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }

    // Small delay to ensure the processing message is shown
    setTimeout(() => {
      // Check if html2pdf is available
      if (typeof html2pdf === "undefined") {
        processingMsg.textContent = "Error: html2pdf library not loaded."
        processingMsg.style.backgroundColor = "#EA4335"
        setTimeout(() => {
          processingMsg.remove()
        }, 3000)
        return
      }

      html2pdf()
        .from(element)
        .set(opt)
        .save()
        .then(() => {
          processingMsg.textContent = "PDF generated successfully!"
          processingMsg.style.backgroundColor = "#34A853"

          setTimeout(() => {
            processingMsg.remove()
          }, 3000)
        })
        .catch((error) => {
          processingMsg.textContent = "Error generating PDF: " + error.message
          processingMsg.style.backgroundColor = "#EA4335"

          setTimeout(() => {
            processingMsg.remove()
          }, 3000)
        })
    }, 100)
  }
}

