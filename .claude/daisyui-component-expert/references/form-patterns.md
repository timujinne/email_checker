# Form Patterns

This guide covers comprehensive form development patterns using daisyUI, including validation, error display, multi-step forms, and file uploads.

## Basic Form Structure

### Form Control Wrapper

The `form-control` class provides consistent spacing and structure:

```html
<form>
  <div class="form-control">
    <label class="label">
      <span class="label-text">Email Address</span>
    </label>
    <input type="email" placeholder="user@example.com" class="input input-bordered" />
    <label class="label">
      <span class="label-text-alt">Helper text goes here</span>
    </label>
  </div>
</form>
```

### Complete Form Example

```html
<form class="space-y-4">
  <!-- Text Input -->
  <div class="form-control">
    <label class="label">
      <span class="label-text">List Name</span>
    </label>
    <input type="text" placeholder="Italy Contacts" class="input input-bordered w-full" />
  </div>

  <!-- Select -->
  <div class="form-control">
    <label class="label">
      <span class="label-text">Category</span>
    </label>
    <select class="select select-bordered w-full">
      <option disabled selected>Select category</option>
      <option>Automotive</option>
      <option>Agriculture</option>
      <option>Manufacturing</option>
    </select>
  </div>

  <!-- Textarea -->
  <div class="form-control">
    <label class="label">
      <span class="label-text">Description</span>
    </label>
    <textarea class="textarea textarea-bordered h-24" placeholder="Optional description"></textarea>
  </div>

  <!-- Checkbox -->
  <div class="form-control">
    <label class="label cursor-pointer justify-start gap-2">
      <input type="checkbox" class="checkbox" />
      <span class="label-text">Exclude duplicates</span>
    </label>
  </div>

  <!-- Submit -->
  <button type="submit" class="btn btn-primary w-full">Create List</button>
</form>
```

---

## Input Validation Patterns

### Client-Side Validation

```html
<form id="emailForm" novalidate>
  <div class="form-control">
    <label class="label">
      <span class="label-text">Email Address</span>
    </label>
    <input 
      type="email" 
      id="email"
      class="input input-bordered w-full" 
      required
      pattern="[^@\s]+@[^@\s]+\.[^@\s]+"
      aria-describedby="emailError" />
    <label class="label">
      <span id="emailError" class="label-text-alt text-error hidden"></span>
    </label>
  </div>
  
  <button type="submit" class="btn btn-primary">Submit</button>
</form>

<script>
const form = document.getElementById('emailForm');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  if (!emailInput.validity.valid) {
    showError(emailInput, emailError);
    return;
  }
  
  // Form is valid, proceed
  submitForm();
});

emailInput.addEventListener('input', () => {
  if (emailInput.validity.valid) {
    clearError(emailInput, emailError);
  }
});

function showError(input, errorSpan) {
  input.classList.add('input-error');
  input.setAttribute('aria-invalid', 'true');
  
  if (input.validity.valueMissing) {
    errorSpan.textContent = 'This field is required';
  } else if (input.validity.typeMismatch || input.validity.patternMismatch) {
    errorSpan.textContent = 'Please enter a valid email address';
  }
  
  errorSpan.classList.remove('hidden');
}

function clearError(input, errorSpan) {
  input.classList.remove('input-error');
  input.setAttribute('aria-invalid', 'false');
  errorSpan.classList.add('hidden');
}
</script>
```

### Validation States

```html
<!-- Success state -->
<div class="form-control">
  <input type="email" class="input input-bordered input-success" />
  <label class="label">
    <span class="label-text-alt text-success">✓ Valid email address</span>
  </label>
</div>

<!-- Warning state -->
<div class="form-control">
  <input type="email" class="input input-bordered input-warning" />
  <label class="label">
    <span class="label-text-alt text-warning">This email is already in use</span>
  </label>
</div>

<!-- Error state -->
<div class="form-control">
  <input type="email" class="input input-bordered input-error" />
  <label class="label">
    <span class="label-text-alt text-error">Invalid email format</span>
  </label>
</div>
```

### Real-Time Validation

```javascript
function validateEmail(input) {
  const value = input.value.trim();
  const errorSpan = input.nextElementSibling.querySelector('.label-text-alt');
  
  // Empty field
  if (value === '') {
    input.classList.remove('input-success', 'input-error', 'input-warning');
    errorSpan.textContent = '';
    return;
  }
  
  // Validate format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    input.classList.remove('input-success', 'input-warning');
    input.classList.add('input-error');
    errorSpan.textContent = 'Invalid email format';
    errorSpan.className = 'label-text-alt text-error';
    return;
  }
  
  // Valid
  input.classList.remove('input-error', 'input-warning');
  input.classList.add('input-success');
  errorSpan.textContent = '✓ Valid email';
  errorSpan.className = 'label-text-alt text-success';
}

// Attach to input
document.getElementById('email').addEventListener('input', (e) => {
  validateEmail(e.target);
});
```

---

## File Upload Components

### Basic File Input

```html
<div class="form-control">
  <label class="label">
    <span class="label-text">Upload Email List</span>
  </label>
  <input 
    type="file" 
    class="file-input file-input-bordered w-full" 
    accept=".txt,.lvp,.csv" />
  <label class="label">
    <span class="label-text-alt">Accepted formats: TXT, LVP, CSV</span>
  </label>
</div>
```

### File Input with Preview

```html
<div class="form-control">
  <label class="label">
    <span class="label-text">Upload File</span>
  </label>
  <input 
    type="file" 
    id="fileInput"
    class="file-input file-input-bordered w-full" 
    accept=".txt,.lvp" />
  <div id="filePreview" class="mt-2 p-3 bg-base-200 rounded-lg hidden">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5"><path d="..."/></svg>
        <span id="fileName" class="font-medium"></span>
        <span id="fileSize" class="text-sm text-base-content/70"></span>
      </div>
      <button type="button" id="removeFile" class="btn btn-ghost btn-xs">✕</button>
    </div>
  </div>
</div>

<script>
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeFile = document.getElementById('removeFile');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    filePreview.classList.remove('hidden');
  }
});

removeFile.addEventListener('click', () => {
  fileInput.value = '';
  filePreview.classList.add('hidden');
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
</script>
```

### Drag and Drop Upload

```html
<div class="form-control">
  <label class="label">
    <span class="label-text">Upload Email List</span>
  </label>
  <div 
    id="dropzone" 
    class="border-2 border-dashed border-base-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors">
    <svg class="w-12 h-12 mx-auto mb-4 text-base-content/50">
      <path d="...upload icon"/>
    </svg>
    <p class="text-base-content/70 mb-2">Drag and drop file here</p>
    <p class="text-sm text-base-content/50 mb-4">or</p>
    <button type="button" class="btn btn-primary btn-sm">Browse Files</button>
    <input type="file" id="fileInput" class="hidden" accept=".txt,.lvp,.csv" />
  </div>
  <div id="fileList" class="mt-4 space-y-2"></div>
</div>

<script>
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');

// Click to browse
dropzone.addEventListener('click', () => fileInput.click());

// Drag and drop
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-primary', 'bg-primary/5');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('border-primary', 'bg-primary/5');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-primary', 'bg-primary/5');
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

function handleFiles(files) {
  fileList.innerHTML = '';
  Array.from(files).forEach(file => {
    const fileItem = document.createElement('div');
    fileItem.className = 'flex items-center justify-between p-3 bg-base-200 rounded-lg';
    fileItem.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-5 h-5"><path d="..."/></svg>
        <span class="font-medium">${file.name}</span>
        <span class="text-sm text-base-content/70">${formatFileSize(file.size)}</span>
      </div>
      <button type="button" class="btn btn-ghost btn-xs" onclick="this.parentElement.parentElement.remove()">✕</button>
    `;
    fileList.appendChild(fileItem);
  });
}
</script>
```

---

## Multi-Step Forms

### Tab-Based Multi-Step Form

```html
<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title">Create Email List</h2>
    
    <!-- Progress Steps -->
    <ul class="steps steps-horizontal w-full mb-6">
      <li class="step step-primary" data-step="1">Details</li>
      <li class="step" data-step="2">Upload</li>
      <li class="step" data-step="3">Options</li>
      <li class="step" data-step="4">Review</li>
    </ul>
    
    <!-- Step 1: Details -->
    <div id="step1" class="step-content">
      <div class="form-control">
        <label class="label"><span class="label-text">List Name</span></label>
        <input type="text" class="input input-bordered" id="listName" />
      </div>
      <div class="form-control mt-4">
        <label class="label"><span class="label-text">Category</span></label>
        <select class="select select-bordered" id="category">
          <option>Automotive</option>
          <option>Agriculture</option>
        </select>
      </div>
    </div>
    
    <!-- Step 2: Upload -->
    <div id="step2" class="step-content hidden">
      <div class="form-control">
        <label class="label"><span class="label-text">Upload File</span></label>
        <input type="file" class="file-input file-input-bordered" />
      </div>
    </div>
    
    <!-- Step 3: Options -->
    <div id="step3" class="step-content hidden">
      <div class="form-control">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox" id="excludeDupes" />
          <span class="label-text">Exclude duplicates</span>
        </label>
      </div>
    </div>
    
    <!-- Step 4: Review -->
    <div id="step4" class="step-content hidden">
      <div class="alert">
        <div>
          <h3 class="font-bold">Review Your Settings</h3>
          <div id="reviewContent" class="text-sm mt-2"></div>
        </div>
      </div>
    </div>
    
    <!-- Navigation -->
    <div class="card-actions justify-between mt-6">
      <button type="button" id="prevBtn" class="btn btn-ghost" disabled>Previous</button>
      <button type="button" id="nextBtn" class="btn btn-primary">Next</button>
    </div>
  </div>
</div>

<script>
let currentStep = 1;
const totalSteps = 4;

function showStep(step) {
  // Hide all steps
  document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
  
  // Show current step
  document.getElementById(`step${step}`).classList.remove('hidden');
  
  // Update progress
  document.querySelectorAll('.step').forEach((el, index) => {
    if (index < step) {
      el.classList.add('step-primary');
    } else {
      el.classList.remove('step-primary');
    }
  });
  
  // Update buttons
  document.getElementById('prevBtn').disabled = step === 1;
  document.getElementById('nextBtn').textContent = step === totalSteps ? 'Submit' : 'Next';
  
  // Show review content on last step
  if (step === totalSteps) {
    updateReview();
  }
}

function updateReview() {
  const reviewContent = document.getElementById('reviewContent');
  reviewContent.innerHTML = `
    <p><strong>List Name:</strong> ${document.getElementById('listName').value}</p>
    <p><strong>Category:</strong> ${document.getElementById('category').value}</p>
    <p><strong>Exclude Duplicates:</strong> ${document.getElementById('excludeDupes').checked ? 'Yes' : 'No'}</p>
  `;
}

document.getElementById('nextBtn').addEventListener('click', () => {
  if (currentStep < totalSteps) {
    currentStep++;
    showStep(currentStep);
  } else {
    submitForm();
  }
});

document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep--;
    showStep(currentStep);
  }
});

function submitForm() {
  alert('Form submitted!');
}
</script>
```

---

## Checkbox and Radio Groups

### Checkbox Group

```html
<fieldset class="form-control">
  <legend class="label">
    <span class="label-text font-semibold">Processing Options</span>
  </legend>
  <label class="label cursor-pointer justify-start gap-2">
    <input type="checkbox" class="checkbox" name="options" value="excludeDupes" />
    <span class="label-text">Exclude duplicates</span>
  </label>
  <label class="label cursor-pointer justify-start gap-2">
    <input type="checkbox" class="checkbox" name="options" value="generateReport" />
    <span class="label-text">Generate HTML report</span>
  </label>
  <label class="label cursor-pointer justify-start gap-2">
    <input type="checkbox" class="checkbox" name="options" value="enrichMetadata" />
    <span class="label-text">Enrich with metadata</span>
  </label>
</fieldset>
```

### Radio Group

```html
<fieldset class="form-control">
  <legend class="label">
    <span class="label-text font-semibold">Output Format</span>
  </legend>
  <label class="label cursor-pointer justify-start gap-2">
    <input type="radio" name="format" class="radio" value="txt" checked />
    <span class="label-text">Text (.txt)</span>
  </label>
  <label class="label cursor-pointer justify-start gap-2">
    <input type="radio" name="format" class="radio" value="csv" />
    <span class="label-text">CSV (.csv)</span>
  </label>
  <label class="label cursor-pointer justify-start gap-2">
    <input type="radio" name="format" class="radio" value="json" />
    <span class="label-text">JSON (.json)</span>
  </label>
</fieldset>
```

---

## Form State Management

### Loading State

```html
<form id="myForm">
  <div class="form-control">
    <input type="text" class="input input-bordered" />
  </div>
  <button type="submit" class="btn btn-primary" id="submitBtn">
    <span id="btnText">Submit</span>
    <span id="btnSpinner" class="loading loading-spinner loading-sm hidden"></span>
  </button>
</form>

<script>
document.getElementById('myForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const btn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  
  // Show loading state
  btn.disabled = true;
  btnText.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  
  try {
    await submitData();
    
    // Success
    showSuccess();
  } catch (error) {
    // Error
    showError(error.message);
  } finally {
    // Reset button
    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
  }
});
</script>
```

### Success/Error Feedback

```html
<div id="formFeedback" class="hidden mb-4"></div>

<script>
function showSuccess(message) {
  const feedback = document.getElementById('formFeedback');
  feedback.className = 'alert alert-success';
  feedback.innerHTML = `
    <svg class="stroke-current shrink-0 w-6 h-6"><path d="..."/></svg>
    <span>${message}</span>
  `;
  feedback.classList.remove('hidden');
  
  setTimeout(() => feedback.classList.add('hidden'), 5000);
}

function showError(message) {
  const feedback = document.getElementById('formFeedback');
  feedback.className = 'alert alert-error';
  feedback.innerHTML = `
    <svg class="stroke-current shrink-0 w-6 h-6"><path d="..."/></svg>
    <span>${message}</span>
  `;
  feedback.classList.remove('hidden');
}
</script>
```

---

## Best Practices

1. **Always provide labels** - Use `<label>` elements or `aria-label`
2. **Show validation inline** - Display errors near the relevant field
3. **Validate on blur, not on every keystroke** - Less intrusive
4. **Provide helpful error messages** - Explain how to fix the issue
5. **Disable submit during processing** - Prevent double submissions
6. **Use appropriate input types** - `type="email"`, `type="tel"`, etc.
7. **Mark required fields** - Visually and with `required` attribute
8. **Test keyboard navigation** - Ensure tab order is logical
9. **Provide success feedback** - Confirm when actions complete
10. **Save form progress** - Use localStorage for long forms

These form patterns provide a solid foundation for building accessible, user-friendly forms with daisyUI.
