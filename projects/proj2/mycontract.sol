pragma solidity >=0.4.22 <0.6.0;

contract BlockchainSplitwise {
    // Debt represents some amount owed. Maximum possible
    // debt is 2^32 ~= 4 billion. We do overflow checking in the contract.
    struct Debt {
        uint32 amount;
    }
    
    // Keeps track of debts. Maps from debtors to a mapping
    // from creditors to debt.
    // For example, debts[Alice][Bob] = 10 means that
    // Alice owes Bob 10.
    mapping(address=>mapping(address=>Debt)) all_debts;
    
    // Looks up the total amount of debt that debtor owes the creditor.
    function lookup(address debtor, address creditor) public view returns (uint32 ret) {
        ret = all_debts[debtor][creditor].amount;
    }
    
    // Adds the fact that msg.sender owes amount more dollars to creditor.
    // path can be an existing path from creditor to msg.sender, implying
    // a cycle will be created by adding this IOU. 'min_on_cycle' is the
    // proposed minimum amount on the cyle, which will be removed from all
    // debts along the path (including the IOU being added).
    //
    // The function verifies the following:
    //    1. If path is given, it indeed exists and connects creditor to debtor.
    //    2. min_on_cycle must be the minimum on the cycle.
    function add_IOU(address creditor, uint32 amount,  address[] memory path, uint32 min_on_cycle) public {
        address debtor = msg.sender;
        Debt storage iou = all_debts[debtor][creditor];  // assigns a reference
        
        // Check for overflow.
        if (min_on_cycle == 0) {
            // No cycles, just add the IOU and return.
            iou.amount = add(iou.amount, amount);
            return;
        }
        // Verify that min_on_cycle is always the amount owed directly (since this is an endge on the cyle)
        require(min_on_cycle <= (iou.amount + amount), "The min on the created cycle cannot be larger than amount.");
        // Verify that the given path exists from creditor to debtor. If it does, it fixes the path.
        require(verify_and_fix_path(creditor, debtor, path, min_on_cycle), "The provided path does not exist from creditor to debtor");
        // Add the new IOU, now that it doesn't create a cycle.
        iou.amount = add(iou.amount, (amount - min_on_cycle));
    }
    
    // Verifies the path is valid and fixes it. The path can be partially fixed, so caller is responsible
    // for undoing a partially fixed path. The easiest way to do this is to use require(), since that will rollback 
    // the transaction.
    function verify_and_fix_path(address start, address end, address[] memory path, uint32 min_on_cycle) private returns (bool ret) {
        if (start != path[0] || end != path[path.length - 1]) {
            return false;
        }
        // Maximu path we are willing to check is size 10, not including start and end.
        if (path.length > 12) {
            return false;
        }
        for (uint i = 1; i < path.length; i++) {
            // If the debt doesn't exist or it's less than min_on_cycle, this is invalid.
            Debt storage iou = all_debts[path[i-1]][path[i]];
            if (iou.amount == 0 || iou.amount < min_on_cycle) {
                return false;
            }
            // Otherwise, it's valid so we go ahead and fix it.
            else {
                iou.amount -= min_on_cycle;
            }
        }
        return true;
    }
    
    // Add with overflow check.
    function add(uint32 a, uint32 b) internal pure returns (uint32) {
      uint32 c = a + b;
      require(c >= a);
      return c;
    }
}