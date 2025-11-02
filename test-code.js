// Sample code to test the flow visualizer
function calculateFactorial(n) {
  // Base case
  if (n <= 1) {
    return 1;
  }

  // Recursive case
  return n * calculateFactorial(n - 1);
}

function findMax(numbers) {
  if (numbers.length === 0) {
    throw new Error("Array is empty");
  }

  let max = numbers[0];

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] > max) {
      max = numbers[i];
    }
  }

  return max;
}

function processUserData(userData) {
  // Validate input
  if (!userData) {
    return { error: "No user data provided" };
  }

  // Check age
  if (userData.age >= 18) {
    // Process adult user
    if (userData.hasLicense) {
      console.log("User can drive");
    } else {
      console.log("User needs a license");
    }
  } else {
    // Process minor
    console.log("User is a minor");
  }

  // Process hobbies
  userData.hobbies.forEach(hobby => {
    console.log(`Processing hobby: ${hobby}`);
  });

  return { success: true };
}