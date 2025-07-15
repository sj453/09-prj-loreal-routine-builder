/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

// Track selected products
let selectedProducts = [];

// Track conversation history
let conversationHistory = [];

// Create modal element for product descriptions
const modal = document.createElement('div');
modal.className = 'product-modal';
modal.innerHTML = `
  <div class="modal-content">
    <button class="modal-close">&times;</button>
    <div class="modal-body"></div>
  </div>
`;
document.body.appendChild(modal);

// Modal close functionality
modal.querySelector('.modal-close').addEventListener('click', () => {
  modal.classList.remove('show');
});

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('show');
  }
});

// Show product details in modal
function showProductDetails(product) {
  const modalBody = modal.querySelector('.modal-body');
  modalBody.innerHTML = `
    <div class="modal-product">
      <img src="${product.image}" alt="${product.name}" class="modal-product-image">
      <div class="modal-product-info">
        <h2>${product.name}</h2>
        <p class="product-category">${product.category}</p>
        <p class="product-description">${product.description || 'No description available.'}</p>
        ${product.benefits ? `
          <div class="product-benefits">
            <h3>Benefits:</h3>
            <ul>
              ${product.benefits.map(benefit => `<li>${benefit}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${product.ingredients ? `
          <div class="product-ingredients">
            <h3>Key Ingredients:</h3>
            <p>${product.ingredients}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  modal.classList.add('show');
}

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

// Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem('selectedProducts', JSON.stringify(selectedProducts));
}

// Load selected products from localStorage
function loadSelectedProducts() {
  const savedProducts = localStorage.getItem('selectedProducts');
  if (savedProducts) {
    selectedProducts = JSON.parse(savedProducts);
    updateSelectedProductsList();
  }
}

// Clear all selected products
function clearSelectedProducts() {
  selectedProducts = [];
  saveSelectedProducts();
  updateSelectedProductsList();
}

// Update the selected products list display
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <div class="placeholder-message">
        No products selected yet
      </div>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product, index) => `
      <div class="selected-product-item">
        <img src="${product.image}" alt="${product.name}" class="selected-thumbnail">
        <div class="selected-product-info">
          <h3>${product.name}</h3>
          <p>${product.category}</p>
        </div>
        <button class="remove-product" data-index="${index}">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `
    ).join("");

  // Add click handlers for remove buttons
  document.querySelectorAll(".remove-product").forEach((button) => {
    button.addEventListener("click", (e) => {
      const index = parseInt(
        e.target.closest(".remove-product").dataset.index
      );
      selectedProducts.splice(index, 1);
      saveSelectedProducts();
      updateSelectedProductsList();
      displayProducts(window.currentProducts || []); // Refresh grid highlighting
    });
  });
}

// Add a button to clear all selections
const clearAllBtn = document.createElement('button');
clearAllBtn.textContent = 'Clear All';
clearAllBtn.className = 'clear-all-button';
clearAllBtn.addEventListener('click', () => {
  clearSelectedProducts();
});
selectedProductsList.parentElement.appendChild(clearAllBtn);

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  
  // Get all available categories with products
  const availableCategories = new Set(data.products.map(p => p.category));
  
  // Hide categories with no products
  Array.from(categoryFilter.options).forEach(option => {
    if (option.value && !availableCategories.has(option.value)) {
      option.remove();
    }
  });

  return data.products;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  window.currentProducts = products; // Store for highlight refresh

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some(
        (p) => p.name === product.name
      );
      return `
        <div class="product-card${isSelected ? " selected" : ""}" data-product-name="${product.name}">
          <button class="info-button" aria-label="Show product details">
            <i class="fa-solid fa-circle-info"></i>
          </button>
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.category}</p>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click handlers for product selection and info buttons
  document.querySelectorAll(".product-card").forEach((card) => {
    const infoBtn = card.querySelector('.info-button');
    const productName = card.dataset.productName;
    const product = products.find((p) => p.name === productName);

    // Info button click handler
    infoBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card selection when clicking info
      showProductDetails(product);
    });

    // Card click handler for selection
    card.addEventListener("click", (e) => {
      if (e.target !== infoBtn && !infoBtn.contains(e.target)) {
        const existingIndex = selectedProducts.findIndex(
          (p) => p.name === productName
        );
        if (existingIndex === -1) {
          selectedProducts.push(product);
        } else {
          selectedProducts.splice(existingIndex, 1);
        }
        saveSelectedProducts();
        updateSelectedProductsList();
        displayProducts(products);
      }
    });
  });
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
});

// Add a search field for filtering products
const searchField = document.createElement('input');
searchField.type = 'text';
searchField.placeholder = 'Search products...';
searchField.className = 'product-search';
productsContainer.parentElement.insertBefore(searchField, productsContainer);

// Filter products by search query and category
searchField.addEventListener('input', async (e) => {
  const searchQuery = e.target.value.toLowerCase();
  const products = await loadProducts();
  const selectedCategory = categoryFilter.value;

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === '' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery) ||
                          (product.description && product.description.toLowerCase().includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  displayProducts(filteredProducts);
});

// Initialize products and categories
loadProducts().then(() => {
  // If there's only one category (besides the placeholder), select it automatically
  if (categoryFilter.options.length === 2) {
    categoryFilter.selectedIndex = 1;
    categoryFilter.dispatchEvent(new Event('change'));
  }
});

// Initialize selected products list
updateSelectedProductsList();

/* Generate routine using OpenAI API */
async function generateRoutine(products) {
  // Show loading state in chat
  chatWindow.innerHTML = `
    <div class="chat-message loading">
      <i class="fa-solid fa-spinner fa-spin"></i> Generating your personalized routine...
    </div>
  `;

  try {
    // Prepare the products data for the prompt
    const productsInfo = products.map(p => ({
      name: p.name,
      category: p.category,
      description: p.description,
      benefits: p.benefits,
      ingredients: p.ingredients
    }));

    // Create the prompt
    const prompt = `Create a personalized skincare/beauty routine using these L'Oréal products:
${JSON.stringify(productsInfo, null, 2)}

Please provide:
1. Morning routine (step by step)
2. Evening routine (step by step)
3. Special tips for optimal results
4. How often to use each product

Format the response in clear, easy-to-read sections.`;

    // Add the initial user message to the conversation history
    conversationHistory.push({ role: 'user', content: prompt });

    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationHistory,
        max_tokens: 800,
        temperature: 0.5,
        frequency_penalty: 0.8
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate routine');
    }

    const data = await response.json();
    const routine = data.choices[0].message.content;

    // Add the AI's response to the conversation history
    conversationHistory.push({ role: 'assistant', content: routine });

    // Format and display the routine
    chatWindow.innerHTML = `
      <div class="chat-message ai">
        <div class="routine-content">
          ${formatRoutine(routine)}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error generating routine:', error);
    chatWindow.innerHTML = `
      <div class="chat-message error">
        Sorry, I couldn't generate a routine right now. Please try again.
      </div>
    `;
  }
}

/* Format the AI response into HTML */
function formatRoutine(text) {
  // Convert markdown-style text to HTML
  return text
    .split('\n')
    .map(line => {
      if (line.startsWith('# ')) {
        return `<h2>${line.substring(2)}</h2>`;
      } else if (line.startsWith('## ')) {
        return `<h3>${line.substring(3)}</h3>`;
      } else if (line.startsWith('- ')) {
        return `<li>${line.substring(2)}</li>`;
      } else if (line.trim() === '') {
        return '</ul><br>';
      } else if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) {
        return `<div class="routine-step">${line}</div>`;
      } else {
        return `<p>${line}</p>`;
      }
    })
    .join('')
    .replace(/<li>(?!<\/ul>)/g, '<ul><li>')
    .replace(/<\/ul><\/ul>/g, '</ul>');
}

// Add click handler for generate routine button
generateRoutineBtn.addEventListener('click', () => {
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML = `
      <div class="chat-message error">
        Please select some products first to generate a routine.
      </div>
    `;
    return;
  }
  generateRoutine(selectedProducts);
});

/* Handle follow-up questions */
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userInput = document.getElementById('userInput').value;
  if (!userInput.trim()) return;

  // Display the user's message in the chat
  chatWindow.innerHTML += `
    <div class="chat-message user">
      ${userInput}
    </div>
  `;

  // Add the user's message to the conversation history
  conversationHistory.push({ role: 'user', content: userInput });

  // Clear the input field
  document.getElementById('userInput').value = '';

  // Show loading state
  const loadingMessage = document.createElement('div');
  loadingMessage.className = 'chat-message loading';
  loadingMessage.innerHTML = `
    <div class="loading-container">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span class="loading-text">Generating a response, please wait...</span>
    </div>
  `;
  chatWindow.appendChild(loadingMessage);

  try {
    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationHistory,
        max_tokens: 800,
        temperature: 0.5,
        frequency_penalty: 0.8
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Add the AI's response to the conversation history
    conversationHistory.push({ role: 'assistant', content: aiResponse });

    // Remove the loading message
    loadingMessage.remove();

    // Display the AI's response in the chat
    const sanitizedResponse = aiResponse
      .replace(/[#*]/g, '') // Remove hashtags and asterisks
      .replace(/[^a-zA-Z0-9\s.,!?]/g, '') // Remove other non-punctual symbols
      .replace(/\n/g, '<br>');
    chatWindow.innerHTML += `
      <div class="chat-message ai">
        <div class="ai-response-container">
          <div class="ai-response-header">AI Response:</div>
          <div class="ai-response-content">
            ${sanitizedResponse}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error handling follow-up question:', error);

    // Remove the loading message
    loadingMessage.remove();

    chatWindow.innerHTML += `
      <div class="chat-message error">
        Sorry, I couldn't process your question. Please try again.
      </div>
    `;
  }
});

// Load selected products on page load
loadSelectedProducts();

// Add a toggle for RTL language support
const rtlToggle = document.createElement('button');
rtlToggle.textContent = 'Enable RTL';
rtlToggle.className = 'rtl-toggle';
productsContainer.parentElement.insertBefore(rtlToggle, productsContainer);

// Toggle RTL mode
let isRTL = false;
rtlToggle.addEventListener('click', () => {
  isRTL = !isRTL;
  document.body.dir = isRTL ? 'rtl' : 'ltr';
  rtlToggle.textContent = isRTL ? 'Disable RTL' : 'Enable RTL';

  // Adjust styles for RTL
  document.body.classList.toggle('rtl-mode', isRTL);
});
